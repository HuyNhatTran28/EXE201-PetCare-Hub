package com.petcare_hub.service.impl;

import com.petcare_hub.service.KycService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class KycServiceImpl implements KycService {

    @Value("${ekyc.base-url}")
    private String baseUrl;

    @Value("${ekyc.token-id}")
    private String tokenId;

    @Value("${ekyc.token-key}")
    private String tokenKey;

    @Value("${ekyc.access-token}")
    private String accessToken;

    @Value("${ekyc.mac-address}")
    private String macAddress;

    @Value("${ekyc.face-match-threshold}")
    private double faceMatchThreshold;

    @Override
    public Map<String, Object> processKyc(MultipartFile frontImage, MultipartFile backImage, MultipartFile selfieImage) throws Exception {
        log.info("Bắt đầu xử lý eKYC qua VNPT. Token-ID: {}", tokenId);

        // Kiểm tra nếu client-id hoặc token chưa được cấu hình hoặc là placeholder mặc định
        boolean isUnconfigured = tokenId == null 
                || tokenId.trim().isEmpty() 
                || tokenId.equals("MÃ_CLIENT_ID_CỦA_BẠN")
                || tokenId.equals("your-ekyc-token-id")
                || tokenKey == null
                || tokenKey.equals("your-ekyc-token-key")
                || accessToken == null
                || accessToken.equals("your-ekyc-access-token");

        if (isUnconfigured) {
            log.warn("VNPT eKYC chưa được cấu hình đầy đủ hoặc sử dụng giá trị mặc định. Báo lỗi vì yêu cầu chạy eKYC thật.");
            Map<String, Object> errorMap = new java.util.HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Xác thực eKYC thất bại: VNPT eKYC chưa được cấu hình đầy đủ. Vui lòng cấu hình token-id, token-key và access-token hợp lệ trong application-local.properties.");
            return errorMap;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> responseMap = new HashMap<>();
            String clientSession = UUID.randomUUID().toString();

            // --- BƯỚC 1: UPLOAD 3 FILE LÊN FILE SERVICE ĐỂ LẤY HASH ---
            log.info("Đang upload ảnh mặt trước CCCD...");
            String frontHash = uploadFileToVnpt(restTemplate, frontImage);
            log.info("Đang upload ảnh mặt sau CCCD...");
            String backHash = uploadFileToVnpt(restTemplate, backImage);
            log.info("Đang upload ảnh chân dung Selfie...");
            String selfieHash = uploadFileToVnpt(restTemplate, selfieImage);

            // --- BƯỚC 2: GỌI API OCR BÓC TÁCH THÔNG TIN CCCD ---
            String ocrUrl = baseUrl + "/ai/v1/ocr/id";
            Map<String, Object> ocrBody = Map.of(
                    "img_front", frontHash,
                    "img_back", backHash,
                    "token", tokenId,
                    "client_session", clientSession
            );

            HttpHeaders ocrHeaders = getVnptHeaders();
            ocrHeaders.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> ocrRequest = new HttpEntity<>(ocrBody, ocrHeaders);
            log.info("Đang gọi VNPT OCR API tại: {}", ocrUrl);
            ResponseEntity<Map> ocrResponse = restTemplate.postForEntity(ocrUrl, ocrRequest, Map.class);
            Map<?, ?> ocrData = ocrResponse.getBody();
            log.info("Dữ liệu bóc tách từ VNPT OCR: {}", ocrData);

            // --- BƯỚC 3: GỌI API FACE COMPARE SO SÁNH KHUÔN MẶT ---
            String matchingUrl = baseUrl + "/ai/v1/face/compare";
            Map<String, Object> matchingBody = Map.of(
                    "img_front", frontHash,
                    "img_face", selfieHash,
                    "token", tokenId,
                    "client_session", clientSession
            );

            HttpHeaders matchingHeaders = getVnptHeaders();
            matchingHeaders.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> matchingRequest = new HttpEntity<>(matchingBody, matchingHeaders);
            log.info("Đang gọi VNPT Face Compare API tại: {}", matchingUrl);
            ResponseEntity<Map> matchingResponse = restTemplate.postForEntity(matchingUrl, matchingRequest, Map.class);
            Map<?, ?> matchingData = matchingResponse.getBody();
            log.info("Kết quả đối sánh khuôn mặt từ VNPT Face Compare: {}", matchingData);

            // --- BƯỚC 4: XỬ LÝ LOGIC DỰA TRÊN KẾT QUẢ CỦA VNPT ---
            Double matchingScore = null;

            // 1. Phân tích điểm từ compare response object
            if (matchingData != null && matchingData.containsKey("object")) {
                Object obj = matchingData.get("object");
                if (obj instanceof Map) {
                    Map<?, ?> objectMap = (Map<?, ?>) obj;
                    if (objectMap.containsKey("prob")) {
                        Object probObj = objectMap.get("prob");
                        if (probObj != null) {
                            try {
                                matchingScore = Double.parseDouble(probObj.toString());
                                if (matchingScore > 1.0) {
                                    matchingScore = matchingScore / 100.0;
                                }
                            } catch (Exception parseEx) {
                                log.error("Lỗi chuyển đổi điểm so khớp: ", parseEx);
                            }
                        }
                    }
                }
            }

            // 2. Fallbacks cho các trường hợp khác
            if (matchingScore == null && matchingData != null) {
                if (matchingData.containsKey("face_matching")) {
                    Map<?, ?> faceMatchingResult = (Map<?, ?>) matchingData.get("face_matching");
                    if (faceMatchingResult != null && faceMatchingResult.containsKey("matching_score")) {
                        Object scoreObj = faceMatchingResult.get("matching_score");
                        if (scoreObj instanceof Number) {
                            matchingScore = ((Number) scoreObj).doubleValue();
                        }
                    }
                }

                if (matchingScore == null && matchingData.containsKey("data")) {
                    Object dataObj = matchingData.get("data");
                    if (dataObj instanceof Map) {
                        Map<?, ?> dataMap = (Map<?, ?>) dataObj;
                        if (dataMap.containsKey("similarity")) {
                            Object simObj = dataMap.get("similarity");
                            if (simObj instanceof Number) {
                                matchingScore = ((Number) simObj).doubleValue();
                                if (matchingScore > 1.0) {
                                    matchingScore = matchingScore / 100.0;
                                }
                            }
                        }
                    }
                }
            }

            // So khớp điểm với ngưỡng threshold cấu hình
            if (matchingScore != null && (matchingScore * 100) >= faceMatchThreshold) {
                responseMap.put("success", true);
                responseMap.put("message", "Xác thực danh tính chủ cửa hàng thành công!");
                responseMap.put("matchingScore", matchingScore);

                // Lấy số CCCD từ kết quả OCR để gửi về FE tự điền
                if (ocrData != null) {
                    String parsedCccd = null;
                    String parsedName = null;

                    // 1. Kiểm tra trong "object" (chuẩn VNPT mới)
                    if (ocrData.containsKey("object")) {
                        Object obj = ocrData.get("object");
                        if (obj instanceof Map) {
                            Map<?, ?> objectMap = (Map<?, ?>) obj;
                            if (objectMap.containsKey("id")) parsedCccd = String.valueOf(objectMap.get("id"));
                            if (objectMap.containsKey("name")) parsedName = String.valueOf(objectMap.get("name"));
                        }
                    }

                    // 2. Kiểm tra trong "data" (chuẩn VNPT cũ/mảng hoặc đối tượng)
                    if (parsedCccd == null && ocrData.containsKey("data")) {
                        Object dataObj = ocrData.get("data");
                        if (dataObj instanceof Map) {
                            Map<?, ?> dataMap = (Map<?, ?>) dataObj;
                            if (dataMap.containsKey("id_number")) parsedCccd = String.valueOf(dataMap.get("id_number"));
                            if (dataMap.containsKey("id")) parsedCccd = String.valueOf(dataMap.get("id"));
                            if (dataMap.containsKey("full_name")) parsedName = String.valueOf(dataMap.get("full_name"));
                            if (dataMap.containsKey("name")) parsedName = String.valueOf(dataMap.get("name"));
                        } else if (dataObj instanceof java.util.List) {
                            java.util.List<?> dataList = (java.util.List<?>) dataObj;
                            if (!dataList.isEmpty() && dataList.get(0) instanceof Map) {
                                Map<?, ?> dataMap = (Map<?, ?>) dataList.get(0);
                                if (dataMap.containsKey("id_number")) parsedCccd = String.valueOf(dataMap.get("id_number"));
                                if (dataMap.containsKey("id")) parsedCccd = String.valueOf(dataMap.get("id"));
                                if (dataMap.containsKey("full_name")) parsedName = String.valueOf(dataMap.get("full_name"));
                                if (dataMap.containsKey("name")) parsedName = String.valueOf(dataMap.get("name"));
                            }
                        }
                    }

                    // 3. Kiểm tra trong "ocr_result" (mô phỏng cũ)
                    if (parsedCccd == null && ocrData.containsKey("ocr_result")) {
                        Map<?, ?> ocrResult = (Map<?, ?>) ocrData.get("ocr_result");
                        if (ocrResult != null) {
                            parsedCccd = String.valueOf(ocrResult.get("id_number"));
                            parsedName = String.valueOf(ocrResult.get("name"));
                        }
                    }

                    responseMap.put("cccdNumber", parsedCccd != null ? parsedCccd : "");
                    responseMap.put("fullName", parsedName != null ? parsedName : "");
                }
            } else {
                responseMap.put("success", false);
                responseMap.put("message", "Khuôn mặt chụp thực tế không trùng khớp với ảnh trên giấy tờ CCCD! (Độ khớp: " 
                        + (matchingScore != null ? Math.round(matchingScore * 100) : 0) + "%)");
                responseMap.put("matchingScore", matchingScore);
            }

            return responseMap;

        } catch (Exception e) {
            log.error("Lỗi khi kết nối hoặc xử lý với API VNPT eKYC thật: ", e);

            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            String errorDetails = e.getMessage();
            if (e instanceof org.springframework.web.client.HttpStatusCodeException) {
                org.springframework.web.client.HttpStatusCodeException hse = (org.springframework.web.client.HttpStatusCodeException) e;
                int statusCode = hse.getStatusCode().value();
                if (statusCode == 401 || statusCode == 403) {
                    errorDetails = "Token eKYC hết hạn hoặc không hợp lệ (HTTP " + statusCode + "). Token VNPT chỉ có hiệu lực tối đa 8 tiếng, vui lòng cập nhật access-token mới trong application-local.properties.";
                } else {
                    errorDetails = "HTTP " + hse.getStatusCode() + " - " + hse.getResponseBodyAsString();
                }
            }
            errorMap.put("message", "Lỗi kết nối API VNPT eKYC: " + errorDetails);
            return errorMap;
        }
    }

    private String uploadFileToVnpt(RestTemplate restTemplate, MultipartFile file) throws Exception {
        String url = baseUrl + "/file-service/v1/addFile";

        HttpHeaders headers = getVnptHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("title", file.getOriginalFilename());
        body.add("description", "ekyc");
        body.add("file", new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        });

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        log.info("Đang gửi yêu cầu upload tệp lên VNPT File Service: {}", url);
        log.info("=== DEBUG HEADERS === Token-id: {}, Token-key (first 10): {}..., Access-token (first 30): {}...",
                tokenId,
                tokenKey != null && tokenKey.length() > 10 ? tokenKey.substring(0, 10) : tokenKey,
                accessToken != null && accessToken.length() > 30 ? accessToken.substring(0, 30) : accessToken);

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, request, Map.class);

        Map<?, ?> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("object")) {
            throw new RuntimeException("Phản hồi từ VNPT File Service không hợp lệ hoặc rỗng.");
        }

        Map<?, ?> object = (Map<?, ?>) responseBody.get("object");
        if (object == null || !object.containsKey("hash")) {
            throw new RuntimeException("Không tìm thấy mã hash của file trong phản hồi VNPT.");
        }

        String hash = object.get("hash").toString();
        log.info("Upload file thành công. Nhận được hash: {}", hash);
        return hash;
    }

    private HttpHeaders getVnptHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String cleanToken = accessToken;
        if (cleanToken != null) {
            cleanToken = cleanToken.trim();
            if (cleanToken.toLowerCase().startsWith("bearer ")) {
                cleanToken = cleanToken.substring(7).trim();
            }
        }
        headers.setBearerAuth(cleanToken);
        headers.add("Token-id", tokenId);
        headers.add("Token-key", tokenKey);
        headers.add("mac-address", macAddress);
        return headers;
    }


}
