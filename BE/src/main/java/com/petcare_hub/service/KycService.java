package com.petcare_hub.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

public interface KycService {
    Map<String, Object> processKyc(MultipartFile frontImage, MultipartFile backImage, MultipartFile selfieImage) throws Exception;
}
