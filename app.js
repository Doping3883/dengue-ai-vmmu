// =================================================================
//                      GLOBAL VARIABLES
// =================================================================
let monitoringData = [];
let riskChart;
let patientsData = {};
let currentPatientId = null;

// =================================================================
//                      INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    initializeRiskChart();
    setupEventListeners();
    loadPatients();
});

function setupEventListeners() {
    // Tự động tính toán khi người dùng nhập liệu
    document.getElementById('onsetDate').addEventListener('input', calculateDiseaseDay);
    document.getElementById('systolicBP').addEventListener('input', calculatePulsePressure);
    document.getElementById('diastolicBP').addEventListener('input', calculatePulsePressure);
    document.getElementById('patientWeight').addEventListener('input', calculateBMI);
    document.getElementById('patientHeight').addEventListener('input', calculateBMI);

    // Quản lý bệnh nhân
    document.getElementById('patientSelect').addEventListener('change', handlePatientSelection);
    
    // Kiểm tra cảnh báo nguy hiểm
    document.querySelectorAll('.warning-sign, input[type="number"]').forEach(el => {
        el.addEventListener('input', checkCriticalAlerts);
    });
}
        
// =================================================================
//                      PATIENT MANAGEMENT
// =================================================================
function savePatient() {
    const patientName = document.getElementById('patientName').value;
    if (!patientName) {
        alert('Vui lòng nhập tên bệnh nhân.');
        return;
    }

    const patientId = currentPatientId || `patient_${Date.now()}`;
    const patientRecord = { id: patientId, data: {}, monitoring: monitoringData };
    
    const formElements = document.querySelectorAll('input, select');
    formElements.forEach(el => {
        if(el.id) {
            patientRecord.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
    });
    
    patientsData[patientId] = patientRecord;
    localStorage.setItem('denguePatients', JSON.stringify(patientsData));
    
    alert(`Đã lưu thông tin cho bệnh nhân: ${patientName}`);
    loadPatients();
    document.getElementById('patientSelect').value = patientId;
}

function loadPatients() {
    const savedData = localStorage.getItem('denguePatients');
    if (savedData) {
        patientsData = JSON.parse(savedData);
        const patientSelect = document.getElementById('patientSelect');
        patientSelect.innerHTML = '<option value="">-- Tải bệnh nhân --</option>';
        
        for (const id in patientsData) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = patientsData[id].data.patientName || `Bệnh nhân ${id}`;
            patientSelect.appendChild(option);
        }
    }
}

function handlePatientSelection() {
    const patientId = document.getElementById('patientSelect').value;
    if (patientId && patientsData[patientId]) {
        currentPatientId = patientId;
        const patientRecord = patientsData[patientId];
        
        for (const key in patientRecord.data) {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = patientRecord.data[key];
                } else {
                    el.value = patientRecord.data[key];
                }
            }
        }
        
        monitoringData = patientRecord.monitoring || [];
        updateMonitoringTable();
        
        performDiagnosis();
    } else {
        clearForm();
    }
}

function deletePatient() {
    const patientId = document.getElementById('patientSelect').value;
    if (patientId && confirm(`Bạn có chắc muốn xóa bệnh nhân: ${patientsData[patientId].data.patientName}?`)) {
        delete patientsData[patientId];
        localStorage.setItem('denguePatients', JSON.stringify(patientsData));
        loadPatients();
        clearForm();
    }
}

function clearForm() {
    const form = document.querySelector('body');
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else if (input.tagName.toLowerCase() !== 'button') input.value = '';
    });

    document.getElementById('diagnosisResult').innerHTML = '<p class="text-gray-600">Nhập thông tin và nhấn "Thực hiện chẩn đoán"...</p>';
    document.getElementById('treatmentPlan').innerHTML = '<div class="p-4 bg-gray-100 rounded-lg"><p class="text-gray-600">Thực hiện chẩn đoán để nhận hướng dẫn điều trị chi tiết...</p></div>';
    
    monitoringData = [];
    updateMonitoringTable();
    initializeRiskChart();
    currentPatientId = null;
    document.getElementById('patientSelect').value = '';
}

function exportPDF() {
    // This function can be further customized to create a more detailed PDF summary if needed.
    const patientName = document.getElementById('patientName').value || "N/A";
    const element = document.getElementById('reportContent');
    const opt = {
        margin: 0.5,
        filename: `ChanDoan_SXH_${patientName.replace(/ /g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
}

// =================================================================
//                      CALCULATIONS
// =================================================================
function calculateDiseaseDay() {
    try {
        const onsetDate = new Date(document.getElementById('onsetDate').value);
        const today = new Date();
        today.setHours(0,0,0,0);
        onsetDate.setHours(0,0,0,0);
        if (onsetDate > today) {
             document.getElementById('diseaseDay').value = '';
             return;
        }
        const diffTime = Math.abs(today - onsetDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('diseaseDay').value = diffDays;
    } catch (e) {
         document.getElementById('diseaseDay').value = '';
    }
}

function calculatePulsePressure() {
    const systolic = parseFloat(document.getElementById('systolicBP').value);
    const diastolic = parseFloat(document.getElementById('diastolicBP').value);
    const pulsePressureEl = document.getElementById('pulsePressure');

    if (systolic > 0 && diastolic > 0 && systolic >= diastolic) {
        pulsePressureEl.value = systolic - diastolic;
    } else {
        pulsePressureEl.value = '';
    }
}

function calculateBMI() {
    const weight = parseFloat(document.getElementById('patientWeight').value);
    const height = parseFloat(document.getElementById('patientHeight').value);
    const bmiEl = document.getElementById('bmi');

    if (weight > 0 && height > 0) {
        const heightInMeters = height / 100;
        const bmiValue = weight / (heightInMeters * heightInMeters);
        bmiEl.value = bmiValue.toFixed(2);
    } else {
        bmiEl.value = '';
    }
}
        
// =================================================================
//                      DIAGNOSIS & GUIDANCE
// =================================================================
function performDiagnosis() {
    const diagnosisResult = analyzeDengueSymptoms();
    displayDiagnosisResult(diagnosisResult);
    generateTreatmentPlan();
    updateRiskChart(diagnosisResult);
    checkCriticalAlerts();
}

function analyzeDengueSymptoms() {
    const diseaseDay = parseInt(document.getElementById('diseaseDay').value);
    
    // Đọc các dấu hiệu cảnh báo từ checkbox
    const warningSigns = {
        restlessness: document.getElementById('restlessness').checked,
        abdominalPain: document.getElementById('abdominalPain').checked,
        persistentVomiting: document.getElementById('persistentVomiting').checked,
        mucosalBleeding: document.getElementById('mucosalBleeding').checked,
        hepatomegaly: document.getElementById('hepatomegaly').checked,
        oliguria: document.getElementById('oliguria').checked,
    };
    
    // Đọc các dấu hiệu của SXH Dengue nặng
    const severeSigns = {
        severePlasmaLeakage: document.getElementById('severePlasmaLeakage').checked,
        severeBleeding: document.getElementById('severeBleeding').checked,
        severeOrganImpairment: document.getElementById('severeOrganImpairment').checked,
    };

    const hematocrit = parseFloat(document.getElementById('hematocrit').value);
    const platelets = parseFloat(document.getElementById('platelets').value);

    // Xác định giai đoạn bệnh
    let stage = 'Giai đoạn sốt';
    if (diseaseDay >= 4 && diseaseDay <= 7) { stage = 'Giai đoạn nguy hiểm'; } 
    else if (diseaseDay > 7) { stage = 'Giai đoạn hồi phục'; }

    // Phân độ nặng
    let severity = 'Sốt Dengue';
    
    const warningSignCount = Object.values(warningSigns).filter(sign => sign).length;
    // Theo QĐ 2760, Hct tăng cao hoặc tiểu cầu giảm nhanh là dấu hiệu cảnh báo
    const hasLabWarning = (hematocrit && hematocrit >= 45) || (platelets && platelets <= 100000);

    if (warningSignCount > 0 || hasLabWarning) {
        severity = 'Sốt Dengue có dấu hiệu cảnh báo';
    }
    
    if (Object.values(severeSigns).some(sign => sign)) {
        severity = 'Sốt Dengue nặng';
    }
    
    // Trả về kết quả phân tích
    return { stage, severity, warningSignCount };
}

function displayDiagnosisResult(result) {
    const resultDiv = document.getElementById('diagnosisResult');
    const riskColor = { 'Thấp': 'text-green-600', 'Trung bình': 'text-yellow-600', 'Cao': 'text-red-600' };
    let riskLevel = 'Thấp';
    if (result.severity === 'Sốt Dengue có dấu hiệu cảnh báo') riskLevel = 'Trung bình';
    if (result.severity === 'Sốt Dengue nặng') riskLevel = 'Cao';

    resultDiv.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center"><i class="fas fa-diagnosis mr-2 text-blue-600"></i><strong>Chẩn đoán:</strong> ${result.severity}</div>
            <div class="flex items-center"><i class="fas fa-clock mr-2 text-gray-600"></i><strong>Giai đoạn:</strong> ${result.stage}</div>
            <div class="flex items-center"><i class="fas fa-exclamation-triangle mr-2 ${riskColor[riskLevel]}"></i><strong>Mức độ nguy hiểm:</strong><span class="${riskColor[riskLevel]} font-semibold ml-1">${riskLevel}</span></div>
            <div class="text-sm text-gray-600"><strong>Số dấu hiệu cảnh báo:</strong> ${result.warningSignCount}/6</div>
        </div>`;
}

function generateTreatmentPlan() {
    const result = analyzeDengueSymptoms();
    const treatmentDiv = document.getElementById('treatmentPlan');
    const weight = parseFloat(document.getElementById('patientWeight').value) || 0;
    let html = '';

    const paracetamolDose = (weight > 0) 
        ? `<li><b>Hạ sốt:</b> Paracetamol ${10 * weight}-${15 * weight} mg/lần, cách 4-6 giờ.</li>` 
        : '<li><b>Hạ sốt:</b> Paracetamol theo liều 10-15 mg/kg/lần.</li>';

    switch (result.severity) {
        case 'Sốt Dengue':
            html = `
                <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h3 class="font-semibold text-green-800 mb-2">Phác đồ Nhóm A: Điều trị tại nhà</h3>
                    <ul class="list-disc list-inside space-y-1 text-green-700">
                        ${paracetamolDose}
                        <li><b>Bù dịch đường uống:</b> Khuyến khích uống nhiều nước, Oresol, nước trái cây.</li>
                        <li><b>Hướng dẫn Oresol:</b> Pha 1 gói với đúng lượng nước (thường là 1 lít), uống thay nước.</li>
                        <li>Theo dõi sát các dấu hiệu cảnh báo để tái khám ngay.</li>
                    </ul>
                </div>`;
            break;

        case 'Sốt Dengue có dấu hiệu cảnh báo':
            const initialFluidMin = (5 * weight).toFixed(0);
            const initialFluidMax = (7 * weight).toFixed(0);
            html = `
                <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h3 class="font-semibold text-yellow-800 mb-2">Phác đồ Nhóm B: Nhập viện theo dõi</h3>
                     <ul class="list-disc list-inside space-y-1 text-yellow-700">
                        ${paracetamolDose}
                        <li><b>Truyền dịch:</b> Chỉ định khi nôn nhiều, không uống được hoặc có dấu hiệu mất nước.</li>
                        <li><b>Loại dịch:</b> Ringer Lactate hoặc NaCl 0,9%.</li>
                        <li>
                            <b>Liều ban đầu:</b> Bắt đầu với 5-7 ml/kg/giờ.
                            ${weight > 0 ? `(Tương đương <b>${initialFluidMin} - ${initialFluidMax} ml/giờ</b>)` : ''}
                        </li>
                        <li>Điều chỉnh tốc độ truyền dịch dựa vào đáp ứng của bệnh nhân và diễn tiến HCT.</li>
                    </ul>
                </div>`;
            break;

        case 'Sốt Dengue nặng':
            const shockFluidMin = (15 * weight).toFixed(0);
            const shockFluidMax = (20 * weight).toFixed(0);
             html = `
                <div class="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 class="font-semibold text-red-800 mb-2">Phác đồ Nhóm C: Điều trị cấp cứu (ICU)</h3>
                    <ul class="list-disc list-inside space-y-1 text-red-700">
                        <li><b>Chống sốc:</b> Bù dịch nhanh qua đường tĩnh mạch.</li>
                        <li><b>Loại dịch:</b> Ringer Lactate hoặc NaCl 0,9%.</li>
                        <li>
                            <b>Liều chống sốc ban đầu:</b> 15-20 ml/kg/giờ, truyền trong 1 giờ.
                            ${weight > 0 ? `(Tương đương <b>${shockFluidMin} - ${shockFluidMax} ml</b> trong giờ đầu)` : ''}
                        </li>
                        <li>Đánh giá lại tình trạng sốc sau mỗi giờ và xử trí theo phác đồ chống sốc của Bộ Y tế.</li>
                        <li>Thở oxy, theo dõi các dấu hiệu sinh tồn liên tục.</li>
                    </ul>
                </div>`;
            break;
        
        default:
             html = `<div class="p-4 bg-gray-100 rounded-lg"><p class="text-gray-600">Chưa đủ thông tin để đưa ra hướng dẫn.</p></div>`;
    }

    treatmentDiv.innerHTML = html;
}

// =================================================================
//                      UI & CHARTS
// =================================================================
function initializeRiskChart() {
    const ctx = document.getElementById('riskChart').getContext('2d');
    if(riskChart) riskChart.destroy();
    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Nguy cơ thấp', 'Nguy cơ trung bình', 'Nguy cơ cao'],
            datasets: [{ data: [33, 33, 34], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Phân tích Nguy cơ' }, legend: { position: 'bottom' } }
        }
    });
}

function updateRiskChart(result) {
    let riskLevel = 'Thấp';
    if (result.severity === 'Sốt Dengue có dấu hiệu cảnh báo') riskLevel = 'Trung bình';
    if (result.severity === 'Sốt Dengue nặng') riskLevel = 'Cao';
    const riskData = { 'Thấp': [70, 20, 10], 'Trung bình': [30, 50, 20], 'Cao': [10, 30, 60] };
    riskChart.data.datasets[0].data = riskData[riskLevel] || [33,33,34];
    riskChart.update();
}
        
function checkCriticalAlerts() {
    // This function can be expanded as needed to include more alerts.
}

// =================================================================
//                      MONITORING TABLE
// =================================================================
function addMonitoringRecord() {
    const record = {
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        consciousness: document.getElementById('monitor_consciousness').value || '-',
        temperature: document.getElementById('monitor_temp').value || '-',
        pulse: document.getElementById('monitor_pulse').value || '-',
        bp: document.getElementById('monitor_bp').value || '-',
        spO2: document.getElementById('monitor_spo2').value || '-',
        fluidIntake: document.getElementById('monitor_fluid_intake').value || '-',
        urineOutput: document.getElementById('monitor_urine_output').value || '-',
        diet: document.getElementById('monitor_diet').value || '-',
        hematocrit: document.getElementById('monitor_hct').value || '-',
        intervention: document.getElementById('monitor_intervention').value || 'Theo dõi'
    };

    monitoringData.unshift(record);
    updateMonitoringTable();

    // Tự động xóa các trường input sau khi thêm
    const fieldsToClear = ['monitor_temp', 'monitor_pulse', 'monitor_bp', 'monitor_spo2', 'monitor_fluid_intake', 'monitor_urine_output', 'monitor_diet', 'monitor_hct', 'monitor_intervention'];
    fieldsToClear.forEach(id => document.getElementById(id).value = '');
}

function updateMonitoringTable() {
    const tableBody = document.getElementById('monitoringTable');
    if (monitoringData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="border p-4 text-center text-gray-600">Chưa có dữ liệu theo dõi</td></tr>';
        return;
    }
    tableBody.innerHTML = monitoringData.map(r => `
        <tr class="text-center">
            <td class="border p-2">${r.time}</td>
            <td class="border p-2">${r.consciousness}</td>
            <td class="border p-2">${r.temperature ? r.temperature + '°C' : '-'}</td>
            <td class="border p-2">${r.pulse || '-'}/${r.bp || '-'}</td>
            <td class="border p-2">${r.spO2 ? r.spO2 + '%' : '-'}</td>
            <td class="border p-2">${r.diet || '-'}/${r.fluidIntake || '-'}ml</td>
            <td class="border p-2">${r.urineOutput ? r.urineOutput + 'ml' : '-'}</td>
            <td class="border p-2">${r.hematocrit ? r.hematocrit + '%' : '-'}</td>
            <td class="border p-2 text-left">${r.intervention}</td>
        </tr>`).join('');
}


// =================================================================
//              PWA SERVICE WORKER REGISTRATION
// =================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js') // Corrected path for deployment
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}