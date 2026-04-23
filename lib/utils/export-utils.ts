import * as XLSX from 'xlsx';

/**
 * Exports data to CSV and triggers download
 */
export const exportToCSV = (data: any[], fileName: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? "" : row[header];
        // Escape quotes and commas
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports data to XLSX and triggers download
 */
export const exportToXLSX = (data: any[], fileName: string) => {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  // Create binary string
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formats user data for export (flattening nested objects)
 */
export const formatUserDataForExport = (users: any[]) => {
  return users.map(user => ({
    'Name': user.name,
    'Email': user.email,
    'Role': user.role,
    'Organization': user.organizationId?.name || 'N/A',
    'Account Number': user.accountNumber || 'N/A',
    'Phone': user.phoneNumber || 'N/A',
    'Committee Role': user.committeeRole || 'General Member',
    'Status': user.isActive ? 'Active' : 'Disabled',
    'Joined Date': new Date(user.createdAt).toLocaleDateString(),
  }));
};
