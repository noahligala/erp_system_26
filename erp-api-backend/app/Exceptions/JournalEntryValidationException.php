<?php

namespace App\Exceptions;

use Exception;

class JournalEntryValidationException extends Exception
{
    // Used for bad inputs (missing accounts, negative numbers, etc.)
    protected $message = 'Journal entry data validation failed.';
    protected $code = 422;
}
