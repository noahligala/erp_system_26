<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewEmployeeCredentials extends Mailable
{
    use Queueable, SerializesModels;

    public $employee;
    public $password;

    public function __construct(User $employee, string $password)
    {
        $this->employee = $employee;
        $this->password = $password;
    }

    public function build()
    {
        return $this->subject('Your Account Credentials')
            ->view('emails.new_employee_credentials')
            ->with([
                'name' => $this->employee->name,
                'email' => $this->employee->email,
                'password' => $this->password,
            ]);
    }
}
