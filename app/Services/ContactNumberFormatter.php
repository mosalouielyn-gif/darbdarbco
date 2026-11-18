<?php

namespace App\Services;

class ContactNumberFormatter
{
    public static function rules(): array
    {
        return ['nullable', 'string', 'max:13', 'regex:/^\d{1,4}(?:-?\d{1,3})?(?:-?\d{1,4})?$/'];
    }

    public static function format(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';
        $digits = substr($digits, 0, 11);
        if ($digits === '') return null;
        if (strlen($digits) <= 4) return $digits;
        if (strlen($digits) <= 7) return substr($digits, 0, 4).'-'.substr($digits, 4);
        return substr($digits, 0, 4).'-'.substr($digits, 4, 3).'-'.substr($digits, 7);
    }
}
