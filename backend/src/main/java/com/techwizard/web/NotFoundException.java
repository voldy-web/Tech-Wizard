package com.techwizard.web;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String what, Long id) { super(what + " " + id + " not found"); }
}
