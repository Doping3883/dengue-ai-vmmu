// THAY THẾ HÀM addMonitoringRecord TRONG app.js BẰNG HÀM NÀY
function addMonitoringRecord() {
    const record = {
        time: new Date().toLocaleTimeString('vi-VN'),
        temperature: document.getElementById('monitor_temp').value || '-',
        pulse: document.getElementById('monitor_pulse').value || '-',
        bp: `${document.getElementById('monitor_sbp').value || '-'}/${document.getElementById('monitor_dbp').value || '-'}`,
        respiratoryRate: document.getElementById('monitor_resp').value || '-',
        spO2: document.getElementById('monitor_spo2').value || '-',
        hematocrit: document.getElementById('monitor_hct').value || '-',
        intervention: document.getElementById('monitor_intervention').value || 'Theo dõi'
    };

    // Kiểm tra xem có dữ liệu được nhập không
    if (Object.values(record).slice(1).every(val => val === '-' || val === '/')) {
        alert('Vui lòng nhập ít nhất một chỉ số theo dõi.');
        return;
    }

    monitoringData.unshift(record);
    updateMonitoringTable();

    // Xóa các trường input sau khi thêm để tiện nhập mới
    document.getElementById('monitor_temp').value = '';
    document.getElementById('monitor_pulse').value = '';
    document.getElementById('monitor_sbp').value = '';
    document.getElementById('monitor_dbp').value = '';
    document.getElementById('monitor_resp').value = '';
    document.getElementById('monitor_spo2').value = '';
    document.getElementById('monitor_hct').value = '';
    document.getElementById('monitor_intervention').value = '';
}


// THAY THẾ HÀM exportPDF TRONG app.js BẰNG HÀM NÀY
function exportPDF() {
    // 1. Thu thập dữ liệu
    const patientName = document.getElementById('patientName').value || "N/A";
    const diagnosisResult = analyzeDengueSymptoms();
    
    // 2. Điền dữ liệu vào div ẩn của PDF
    document.getElementById('pdf_patientName').textContent = patientName;
    document.getElementById('pdf_patientAge').textContent = document.getElementById('patientAge').value || "N/A";
    document.getElementById('pdf_patientWeight').textContent = document.getElementById('patientWeight').value || "N/A";
    document.getElementById('pdf_diseaseDay').textContent = document.getElementById('diseaseDay').value || "N/A";

    document.getElementById('pdf_diagnosis').textContent = diagnosisResult.severity;
    document.getElementById('pdf_stage').textContent = diagnosisResult.stage;
    document.getElementById('pdf_riskLevel').textContent = diagnosisResult.riskLevel;

    document.getElementById('pdf_hct').textContent = document.getElementById('hematocrit').value || "N/A";
    document.getElementById('pdf_platelets').textContent = document.getElementById('platelets').value || "N/A";
    document.getElementById('pdf_ast').textContent = document.getElementById('ast').value || "N/A";
    document.getElementById('pdf_alt').textContent = document.getElementById('alt').value || "N/A";
    
    const treatmentDiv = document.getElementById('treatmentRecommendations');
    document.getElementById('pdf_treatment').innerHTML = treatmentDiv.innerHTML;


    // 3. Gọi html2pdf để tạo file PDF từ div đã điền
    const element = document.getElementById('pdf-summary');
    const opt = {
        margin: 0.5,
        filename: `TomTat_ChanDoan_SXH_${patientName.replace(/ /g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
}