<?php

namespace App\Models\Accounts;

use App\Models\CRM\Customer; // Assuming CRM namespace based on prior context
use App\Models\Accounts\Invoice;
use App\Models\User;
use App\Models\Accounts\ChartOfAccount; // 💡 ADDED: ChartOfAccount model import
use App\Models\Accounts\JournalEntry;   // 💡 ADDED: JournalEntry model import
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'invoice_id',
        'payment_date',
        'method',
        'reference',
        'amount',
        'notes',
        'created_by',
        'updated_by',
        'journal_entry_id',
        'company_id',
        // Assuming 'cash_account_id' was added to the database table
        // and should be fillable based on controller logic:
        'cash_account_id',
    ];

    // --- Relationships used by Controller/UI ---

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // 💡 FIX 1: Relationship for the Cash/Bank GL Account (used in index, show)
    public function cashAccount()
    {
        // Links 'cash_account_id' (on CustomerPayment) to 'id' (on ChartOfAccount)
        return $this->belongsTo(ChartOfAccount::class, 'cash_account_id');
    }

    // 💡 FIX 2: Relationship for the associated Journal Entry (used in show, destroy)
    public function journalEntry()
    {
        // Links 'journal_entry_id' (on CustomerPayment) to 'id' (on JournalEntry)
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
