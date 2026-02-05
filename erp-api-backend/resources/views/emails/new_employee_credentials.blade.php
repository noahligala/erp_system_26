<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Employee Account</title>
</head>
<body>
    <h2>Welcome to {{ config('app.name') }}, {{ $employee->first_name }}!</h2>

    <p>Your employee account has been created successfully.</p>

    <p><strong>Login Email:</strong> {{ email }}</p>
    <p><strong>Temporary Password:</strong> {{ $password }}</p>

    <p>Kindly log in using these credentials and change your password immediately after your first login.</p>

    <p>Best Regards,<br>
    {{ config('app.name') }} Team</p>
</body>
</html>
