export const prepareTeamData = (rawData) => {
  return rawData.map((user) => ({
    id: user.id,
    employeeID: user.employee_profile?.id || "-", 
    name: user.name,
    email: user.email,
    phone: user.phone_number,
    companyRole: user.company_role,
    nssfNumber: user.employee_profile?.nssf_number || "-",
    nhifNumber: user.employee_profile?.nhif_number || "-",
    kraPIN: user.employee_profile?.kra_pin || "-",
    department: user.employee_profile?.department?.name || "N/A",
    jobTitle: user.employee_profile?.job_title?.name || "N/A",
    salary: user.employee_profile?.salary || 0,
    disability: user.employee_profile?.has_disability ? "Yes" : "No",
    hiredOn: user.employee_profile?.hired_on || "-",
    terminatedOn: user.employee_profile?.terminated_on || "-",
    bankName: user.employee_profile?.bank_name || "-", 
    bankAccount: user.employee_profile?.bank_account_number || "-", 
    bankBranch: user.employee_profile?.bank?.branch || "-", // new field
  }));
};
