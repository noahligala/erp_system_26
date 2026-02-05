<?php

namespace App\Services\Banking\Traits;

use Illuminate\Support\Facades\Storage;
use Exception;

trait MpesaSecurity
{
    /**
     * Generate the encrypted Security Credential required by Daraja.
     */
    protected function generateSecurityCredential(string $plaintextPassword): string
    {
        // You must store the Safaricom Certificate in your storage/app folder
        // Sandbox: https://developer.safaricom.co.ke/sites/default/files/cert/cert_sandbox/cert.cer
        // Production: https://developer.safaricom.co.ke/sites/default/files/cert/cert_prod/cert.cer

        $certName = $this->environment === 'production' ? 'mpesa_production.cer' : 'mpesa_sandbox.cer';
        $pubKey = Storage::get("certs/{$certName}");

        if (!$pubKey) {
            throw new Exception("M-Pesa Public Certificate not found: {$certName}");
        }

        openssl_public_encrypt($plaintextPassword, $encrypted, $pubKey, OPENSSL_PKCS1_PADDING);

        return base64_encode($encrypted);
    }
}
