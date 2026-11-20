// Currency and number formatting utilities (Fintech Indian Rupees & standard formats)

export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatLakhCrore = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return formatINR(amount);
};

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      let cell = obj[header] ?? '';
      if (typeof cell === 'object') cell = JSON.stringify(cell);
      cell = String(cell).replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
      return cell;
    }).join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data, filename = 'export.xls') => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
  html += '<body><table border="1"><thead><tr style="background:#DC2626;color:#ffffff;font-weight:bold;">';
  headers.forEach(h => {
    html += `<th style="padding:6px 12px;">${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach((row, i) => {
    html += `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">`;
    headers.forEach(h => {
      let cell = row[h] ?? '';
      if (typeof cell === 'object') cell = JSON.stringify(cell);
      html += `<td style="padding:6px 12px;">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = ({
  title = 'REALCRED Management Report',
  subtitle = '',
  summaryCards = [],
  tableHeaders = [],
  tableRows = [],
  role = 'Executive'
}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups in your browser to download/print the PDF report.');
    return;
  }

  const generatedTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let cardsHtml = '';
  if (summaryCards && summaryCards.length) {
    cardsHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0;">
        ${summaryCards
          .map(
            (c) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${c.label}</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:3px;">${c.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  let tableHtml = '';
  if (tableHeaders && tableHeaders.length && tableRows) {
    tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-top:14px;">
        <thead>
          <tr style="background:#0f172a;color:#ffffff;text-align:left;">
            ${tableHeaders
              .map(
                (h) => `
              <th style="padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${h}</th>
            `
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows
            .map(
              (row, i) => `
            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:1px solid #e2e8f0;">
              ${row
                .map(
                  (cell) => `
                <td style="padding:7px 10px;color:#334155;">${cell ?? '—'}</td>
              `
                )
                .join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 16px;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #DC2626;
            padding-bottom: 12px;
          }
          .brand-logo {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .brand-logo span {
            color: #DC2626;
          }
          .meta-info {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .footer-note {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
          .no-print-bar {
            background: #f1f5f9;
            padding: 8px 14px;
            border-radius: 8px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-btn {
            background: #DC2626;
            color: #fff;
            border: none;
            padding: 6px 14px;
            font-weight: bold;
            font-size: 11px;
            border-radius: 6px;
            cursor: pointer;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <span style="font-size:11px;font-weight:600;color:#334155;">Report Ready. Choose "Save as PDF" in your print dialog.</span>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="header-box">
          <div>
            <div class="brand-logo">Real<span>Cred</span></div>
            <div style="font-size:10px;font-weight:700;color:#64748b;margin-top:2px;">REALCRED TECHNOLOGY PRIVATE LIMITED</div>
            <h1 style="font-size:16px;font-weight:800;color:#0f172a;margin:6px 0 2px 0;">${title}</h1>
            <div style="font-size:11px;color:#475569;font-weight:500;">${subtitle}</div>
          </div>
          <div class="meta-info">
            <div style="font-weight:700;color:#0f172a;font-size:11px;">Portal: ${role}</div>
            <div>Generated: ${generatedTime}</div>
            <div>Official Sourcing Ledger</div>
          </div>
        </div>

        ${cardsHtml}

        <div style="margin-top:14px;">
          <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:6px;">Itemized Records (${tableRows ? tableRows.length : 0})</div>
          ${tableHtml}
        </div>

        <div class="footer-note">
          <span>© RealCred Technology Private Limited. Confidential lending platform records.</span>
          <span>System Generated Report</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

