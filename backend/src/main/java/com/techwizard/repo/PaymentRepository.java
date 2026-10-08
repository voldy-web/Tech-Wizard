package com.techwizard.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techwizard.model.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {}
