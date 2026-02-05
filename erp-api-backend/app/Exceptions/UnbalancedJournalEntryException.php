<?php

namespace App\Exceptions;

use Exception;

class UnbalancedJournalEntryException extends Exception
{
    // Used specifically when total debits != total credits
    protected $message = 'Journal entry debits and credits do not balance.';
    protected $code = 422;
}
