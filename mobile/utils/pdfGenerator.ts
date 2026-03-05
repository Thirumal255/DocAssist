// mobile/utils/pdfGenerator.ts

export const generatePrescriptionHtml = (data: any, baseUrl: string) => {
  const { doctor, patient, prescription, clinic } = data;
  
  // Extract the template if it exists, otherwise use an empty object for fallbacks
  const template = doctor?.template || {};

  // --- DYNAMIC VARIABLES WITH FALLBACKS ---
  const brandColor = template.brandColor || '#0A7B6E';
  const headerAlign = template.headerStyle === 'center' ? 'center' : 'left';
  const paperSize = template.paperSize || 'A4';
  
  // Overrides for Clinic Info
  const clinicName = template.clinicName || clinic?.name || "DocAssist Care";
  const clinicAddress = template.clinicAddress || clinic?.address || "123 Health Avenue, Medical District, City - 100001";
  const clinicPhone = template.clinicContact || clinic?.phone || "+91 98765 43210";
  const footerText = template.footerText || "This is a digitally generated prescription. Not valid for medico-legal purposes without a physical signature.";

  // Toggles
  const showVitals = template.showVitals !== false; // defaults to true
  const showDiagnosis = template.showDiagnosis !== false;
  const showPatientDetails = template.showPatientDetails !== false;

  // Formatting
  const dateStr = new Date(prescription.createdAt || new Date()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Images (Needs the absolute backend URL to render in a PDF)
  const logoHtml = template.logoBase64 
  ? `<img src="${template.logoBase64}" style="max-height: 70px; margin-bottom: 10px;" />` 
  : '';
    
  const signatureHtml = template.digitalSignatureUrl 
    ? `<img src="${baseUrl}${template.digitalSignatureUrl}" style="max-height: 60px; margin-bottom: 5px;" />` 
    : `<div class="signature-line"></div>`;

  // Generate Table Rows for Medicines
  const medicinesHtml = prescription.items.map((med: any, index: number) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td>
        <strong>${med.medicineName}</strong>
        ${med.genericName ? `<br><small style="color: #666;">${med.genericName}</small>` : ''}
      </td>
      <td style="text-align: center;">${med.dose}</td>
      <td style="text-align: center;">${med.frequency}</td>
      <td style="text-align: center;">${med.timing ? med.timing.replace('_', ' ').toUpperCase() : '-'}</td>
      <td style="text-align: center;">${med.days} Days</td>
      <td>${med.instructions || '-'}</td>
    </tr>
  `).join('');

  // The complete HTML String
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          margin: 0;
          /* Adjust padding if A5 paper is selected */
          padding: ${paperSize === 'A5' ? '15px' : '30px'};
          line-height: 1.5;
        }
        
        /* HEADER */
        .header {
          display: flex;
          flex-direction: ${headerAlign === 'center' ? 'column' : 'row'};
          align-items: ${headerAlign === 'center' ? 'center' : 'flex-start'};
          justify-content: space-between;
          border-bottom: 3px solid ${brandColor};
          padding-bottom: 20px;
          margin-bottom: 20px;
          text-align: ${headerAlign};
        }
        .clinic-info { text-align: ${headerAlign}; }
        .clinic-info h1 { margin: 0; color: ${brandColor}; font-size: 28px; }
        .clinic-info p { margin: 4px 0; color: #555; font-size: 12px; }
        .doctor-info { text-align: ${headerAlign === 'center' ? 'center' : 'right'}; margin-top: ${headerAlign === 'center' ? '20px' : '0'}; }
        .doctor-info h2 { margin: 0; color: #2C3E50; font-size: 22px; }
        .doctor-info p { margin: 4px 0; color: #555; font-size: 12px; }

        /* PATIENT INFO */
        .patient-box {
          background-color: #F5F8FA;
          border: 1px solid #DCE4ED;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          display: ${showPatientDetails ? 'flex' : 'none'};
          justify-content: space-between;
        }
        .patient-box div { flex: 1; }
        .label { font-size: 10px; color: #6B7C93; text-transform: uppercase; font-weight: bold; }
        .value { font-size: 14px; color: #0D1B2A; font-weight: 600; margin-top: 2px; }
        
        /* VITALS */
        .vitals-bar {
          display: ${showVitals && prescription.vitals ? 'flex' : 'none'};
          gap: 20px;
          padding-bottom: 15px;
          border-bottom: 1px dashed #DCE4ED;
          margin-bottom: 20px;
        }
        
        /* RX SECTION */
        .rx-symbol { font-size: 32px; font-weight: bold; color: ${brandColor}; margin-bottom: 15px; font-family: serif;}
        
        .diagnosis { display: ${showDiagnosis && prescription.diagnosis ? 'block' : 'none'}; margin-bottom: 20px; }
        .diagnosis-title { font-weight: bold; color: #2C3E50; font-size: 14px; }
        .diagnosis-text { font-size: 14px; color: #333; }

        /* TABLE */
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th {
          background-color: #F5F8FA;
          color: #2C3E50;
          font-size: 12px;
          text-align: left;
          padding: 10px;
          border-bottom: 2px solid ${brandColor}; /* Dynamic Color */
        }
        td { padding: 12px 10px; border-bottom: 1px solid #EEE; font-size: 13px; }

        /* FOOTER */
        .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
        .signature-box { text-align: center; }
        .signature-line { width: 150px; border-top: 1px solid #333; margin-bottom: 5px; }
        .footer-note { font-size: 10px; color: #999; text-align: center; margin-top: 30px; border-top: 1px solid #EEE; padding-top: 10px;}
      </style>
    </head>
    <body>

      <div class="header">
        <div class="clinic-info">
          ${logoHtml}
          <h1>${clinicName}</h1>
          <p>${clinicAddress}</p>
          <p>📞 ${clinicPhone}</p>
        </div>
        <div class="doctor-info">
          <h2>${doctor.name}</h2>
          <p>${doctor.specialty || 'General Physician'}</p>
          <p>Reg No: ${doctor.registrationNo || 'REG-12345'}</p>
        </div>
      </div>

      <div class="patient-box">
        <div>
          <div class="label">Patient Name</div>
          <div class="value">${patient.name}</div>
        </div>
        <div>
          <div class="label">Age / Gender</div>
          <div class="value">${patient.age || '--'} / ${patient.gender || '--'}</div>
        </div>
        <div>
          <div class="label">Date</div>
          <div class="value">${dateStr}</div>
        </div>
        <div style="text-align: right;">
          <div class="label">Prescription ID</div>
          <div class="value">#${prescription.id.substring(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <div class="vitals-bar">
        ${prescription.vitals?.bp ? `<div><span class="label">BP:</span> <span class="value">${prescription.vitals.bp}</span></div>` : ''}
        ${prescription.vitals?.pulse ? `<div><span class="label">Pulse:</span> <span class="value">${prescription.vitals.pulse} bpm</span></div>` : ''}
        ${prescription.vitals?.weight ? `<div><span class="label">Weight:</span> <span class="value">${prescription.vitals.weight} kg</span></div>` : ''}
        ${prescription.vitals?.temperature ? `<div><span class="label">Temp:</span> <span class="value">${prescription.vitals.temperature} °F</span></div>` : ''}
      </div>

      <div class="diagnosis">
        <span class="diagnosis-title">Diagnosis:</span> 
        <span class="diagnosis-text">${prescription.diagnosis}</span>
      </div>

      <div class="rx-symbol">℞</div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 5%;">#</th>
            <th style="width: 30%;">Medicine Name</th>
            <th style="text-align: center; width: 10%;">Dose</th>
            <th style="text-align: center; width: 10%;">Freq</th>
            <th style="text-align: center; width: 15%;">Timing</th>
            <th style="text-align: center; width: 10%;">Duration</th>
            <th style="width: 20%;">Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${medicinesHtml}
        </tbody>
      </table>

      <div class="footer">
        <div></div>
        <div class="signature-box">
          ${signatureHtml}
          <div style="font-size: 14px; font-weight: bold;">${doctor.name}</div>
          <div style="font-size: 10px; color: #666;">Signature / Seal</div>
        </div>
      </div>

      <div class="footer-note">${footerText}</div>

    </body>
    </html>
  `;
};