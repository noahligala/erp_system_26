<?php
namespace App\Helpers;

use Exception;

class ApiEncoder
{
    public static function encode(string $path, string $secretKey): string
    {
        $key = hash('sha256', $secretKey, true);
        $iv = random_bytes(16);

        $encrypted = openssl_encrypt($path, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($encrypted === false) {
            throw new Exception("Encryption failed");
        }

        $signature = hash_hmac('sha256', $encrypted, $key, true);
        return base64_encode($iv . $signature . $encrypted);
    }

    public static function decode(string $encoded, string $secretKey): ?string
    {
        $key = hash('sha256', $secretKey, true);
        $data = base64_decode($encoded, true);
        if (!$data || strlen($data) < 48) return null;

        $iv = substr($data, 0, 16);
        $signature = substr($data, 16, 32);
        $encrypted = substr($data, 48);

        $validSignature = hash_hmac('sha256', $encrypted, $key, true);
        if (!hash_equals($signature, $validSignature)) {
            return null;
        }

        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        return $decrypted ?: null;
    }
}
