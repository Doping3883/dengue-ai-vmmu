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
    // Tự động tính toán
    document.getElementById('onsetDate').addEventListener('input', calculateDiseaseDay);
    
    // Quản lý bệnh nhân
    document.getElementById('patientSelect').addEventListener('change', handlePatientSelection);
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
    
    const formElements = document.querySelectorAll('input[id], select[id], textarea[id]');
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
        
        clearForm(false); // Xóa form nhưng không reset data
        
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
        clearForm(true);
    }
}

function deletePatient() {
    const patientId = document.getElementById('patientSelect').value;
    if (patientId && confirm(`Bạn có chắc muốn xóa bệnh nhân: ${patientsData[patientId].data.patientName}?`)) {
        delete patientsData[patientId];
        localStorage.setItem('denguePatients', JSON.stringify(patientsData));
        loadPatients();
        clearForm(true);
    }
}

function clearForm(resetData = true) {
    const form = document.querySelector('body');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.tagName.toLowerCase() !== 'button' && input.id !== 'patientSelect') {
            input.value = '';
        }
    });

    // Reset UI elements
    document.getElementById('diagnosisResult').innerHTML = '<p class="text-gray-600">Chờ kết quả...</p>';
    document.getElementById('treatmentPlan').innerHTML = '<div class="p-4 bg-gray-100 rounded-lg"><p>Chờ kết quả chẩn đoán...</p></div>';
    document.getElementById('differentialDiagnosis').innerHTML = '<div class="p-4 bg-gray-100 rounded-lg"><p>Chờ kết quả chẩn đoán...</p></div>';
    document.getElementById('aiAlerts').classList.add('hidden');
    document.getElementById('consultationAlert').classList.add('hidden');
    document.getElementById('shockManagementSection').classList.add('hidden');
    
    if (resetData) {
        monitoringData = [];
        updateMonitoringTable();
        initializeRiskChart();
        currentPatientId = null;
        document.getElementById('patientSelect').value = '';
    }
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
        if (isNaN(onsetDate.getTime()) || onsetDate > today) {
             document.getElementById('diseaseDay').value = ''; return;
        }
        const diffTime = Math.abs(today - onsetDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('diseaseDay').value = diffDays;
    } catch (e) {
         document.getElementById('diseaseDay').value = '';
    }
}
        
// =================================================================
//                      DIAGNOSIS & GUIDANCE
// =================================================================

function getPatientDataFromForm() {
    const data = {};
    const formElements = document.querySelectorAll('input[id], select[id], textarea[id]');
    formElements.forEach(el => {
        data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return data;
}

function performDiagnosis() {
    const patientData = getPatientDataFromForm();
    const diagnosisResult = analyzeDengueSymptoms(patientData);

    // Update all UI components based on the new diagnosis
    displayDiagnosisResult(diagnosisResult);
    generateTreatmentPlan(patientData, diagnosisResult);
    updateRiskChart(diagnosisResult);
    checkAndDisplayAlerts(patientData, diagnosisResult);
    generateDifferentialDiagnosis(patientData, diagnosisResult);
    
    // Show/hide advanced sections
    const shockSection = document.getElementById('shockManagementSection');
    const consultationAlert = document.getElementById('consultationAlert');
    
    if (diagnosisResult.severity === 'Sốt Dengue nặng') {
        shockSection?.classList.remove('hidden');
        if (patientData.severeBleeding || patientData.severeOrganImpairment) {
            consultationAlert?.classList.remove('hidden');
        } else {
            consultationAlert?.classList.add('hidden');
        }
    } else {
        shockSection?.classList.add('hidden');
        consultationAlert?.classList.add('hidden');
    }
}

function analyzeDengueSymptoms(data) {
    const {
        diseaseDay, restlessness, abdominalPain, persistentVomiting,
        mucosalBleeding, hepatomegaly, oliguria,
        severePlasmaLeakage, severeBleeding, severeOrganImpairment,
        hematocrit, platelets, wbc,
        risk_infant, risk_obesity, risk_pregnancy, risk_elderly,
        risk_diabetes, risk_renal, risk_heart
    } = data;

    let stage = 'Giai đoạn sốt';
    if (diseaseDay >= 4 && diseaseDay <= 7) stage = 'Giai đoạn nguy hiểm'; 
    else if (diseaseDay > 7) stage = 'Giai đoạn hồi phục';

    let severity = 'Sốt Dengue';
    let hospitalizationRecommended = false;
    
    const warningSigns = [restlessness, abdominalPain, persistentVomiting, mucosalBleeding, hepatomegaly, oliguria];
    const warningSignCount = warningSigns.filter(Boolean).length;
    
    const riskFactors = [risk_infant, risk_obesity, risk_pregnancy, risk_elderly, risk_diabetes, risk_renal, risk_heart];
    const hasRiskFactors = riskFactors.some(Boolean);

    const hasLabWarning = (hematocrit && hematocrit >= 45) || (platelets && platelets <= 100000) || (wbc && wbc < 4.0);

    if (warningSignCount > 0 || hasLabWarning) {
        severity = 'Sốt Dengue có dấu hiệu cảnh báo';
        hospitalizationRecommended = true;
    }
    
    if (severePlasmaLeakage || severeBleeding || severeOrganImpairment) {
        severity = 'Sốt Dengue nặng';
        hospitalizationRecommended = true;
    }

    // Recommend hospitalization even for mild cases if risk factors are present
    if (severity === 'Sốt Dengue' && hasRiskFactors) {
        hospitalizationRecommended = true;
    }
    
    return { stage, severity, warningSignCount, hospitalizationRecommended, hasRiskFactors };
}

function displayDiagnosisResult(result) {
    const resultDiv = document.getElementById('diagnosisResult');
    if (!resultDiv) return;

    const riskColor = { 'Thấp': 'text-green-600', 'Trung bình': 'text-yellow-600', 'Cao': 'text-red-600' };
    let riskLevel = 'Thấp';
    if (result.severity === 'Sốt Dengue có dấu hiệu cảnh báo') riskLevel = 'Trung bình';
    if (result.severity === 'Sốt Dengue nặng') riskLevel = 'Cao';

    let recommendationText = '';
    if (result.hospitalizationRecommended) {
        recommendationText = `<div class="mt-3 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md text-sm font-semibold">
            <i class="fas fa-hospital-symbol mr-2"></i>Gợi ý: Cần nhập viện theo dõi ${result.hasRiskFactors ? 'do có yếu tố nguy cơ.' : '.'}
        </div>`;
    }

    resultDiv.innerHTML = `
        <div class="space-y-2">
            <div><i class="fas fa-diagnosis mr-2 text-blue-600"></i><strong>Chẩn đoán:</strong> <span class="font-semibold">${result.severity}</span></div>
            <div><i class="fas fa-clock mr-2 text-gray-600"></i><strong>Giai đoạn:</strong> ${result.stage}</div>
            <div><i class="fas fa-exclamation-triangle mr-2 ${riskColor[riskLevel]}"></i><strong>Mức độ nguy hiểm:</strong><span class="${riskColor[riskLevel]} font-semibold ml-1">${riskLevel}</span></div>
        </div>
        ${recommendationText}
    `;
}

function generateTreatmentPlan(patientData, diagnosisResult) {
    const treatmentDiv = document.getElementById('treatmentPlan');
    if (!treatmentDiv) return;

    const { weight } = patientData;
    const { severity } = diagnosisResult;
    let html = '';

    const paracetamolDose = (weight > 0) 
        ? `<li><b>Hạ sốt:</b> Paracetamol ${10 * weight}-${15 * weight} mg/lần, cách 4-6 giờ.</li>` 
        : '<li><b>Hạ sốt:</b> Paracetamol theo liều 10-15 mg/kg/lần.</li>';

    switch (severity) {
        case 'Sốt Dengue':
            html = `<div class="bg-green-50 border border-green-200 p-4 rounded-lg"><h3 class="font-semibold text-green-800 mb-2">Phác đồ Nhóm A: Điều trị ngoại trú</h3><ul class="list-disc list-inside space-y-1 text-green-700">${paracetamolDose}<li><b>Bù dịch đường uống:</b> Khuyến khích uống Oresol, nước trái cây.</li><li>Theo dõi sát các dấu hiệu cảnh báo để tái khám ngay.</li></ul></div>`;
            break;
        case 'Sốt Dengue có dấu hiệu cảnh báo':
            const initialFluidMin = (5 * weight).toFixed(0);
            const initialFluidMax = (7 * weight).toFixed(0);
            html = `<div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg"><h3 class="font-semibold text-yellow-800 mb-2">Phác đồ Nhóm B: Điều trị nội trú</h3><ul class="list-disc list-inside space-y-1 text-yellow-700">${paracetamolDose}<li><b>Truyền dịch:</b> Ringer Lactate hoặc NaCl 0,9%.</li><li><b>Liều ban đầu:</b> Bắt đầu với 5-7 ml/kg/giờ. ${weight > 0 ? `(Tương đương <b>${initialFluidMin} - ${initialFluidMax} ml/giờ</b>)` : ''}</li><li>Điều chỉnh tốc độ truyền dịch dựa vào đáp ứng lâm sàng và HCT.</li></ul></div>`;
            break;
        case 'Sốt Dengue nặng':
            html = `<div class="bg-red-50 border border-red-200 p-4 rounded-lg"><h3 class="font-semibold text-red-800 mb-2">Phác đồ Nhóm C: Điều trị cấp cứu (ICU)</h3><p>Vui lòng tham khảo chi tiết hướng dẫn tại mục "Hướng dẫn Xử trí Sốc Dengue" được hiển thị bên dưới.</p></div>`;
            break;
    }
    treatmentDiv.innerHTML = html;
}

function generateDifferentialDiagnosis(patientData, diagnosisResult) {
    const diffDiv = document.getElementById('differentialDiagnosis');
    if (!diffDiv) return;
    const { fever, petechiae, myalgia } = patientData;
    let suggestions = [];

    if (fever && petechiae) suggestions.push({ disease: 'Sốt phát ban (Sởi, Rubella)', features: 'Thường có ban dạng sẩn, viêm long đường hô hấp hoặc nổi hạch.' });
    if (fever && myalgia) suggestions.push({ disease: 'Chikungunya', features: 'Đặc trưng bởi đau khớp rất nặng.' });
    if (diagnosisResult.severity.includes('nặng')) suggestions.push({ disease: 'Sốc nhiễm khuẩn', features: 'Tìm ổ nhiễm trùng ban đầu và dựa vào kết quả cấy vi khuẩn.' });

    if (suggestions.length === 0) {
        diffDiv.innerHTML = `<div class="p-4 bg-gray-100 rounded-lg"><p>Chưa có gợi ý chẩn đoán phân biệt rõ ràng.</p></div>`;
        return;
    }
    diffDiv.innerHTML = suggestions.map(item => `<div class="p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg"><h4 class="font-semibold text-indigo-800">${item.disease}</h4><p class="text-sm text-indigo-700"><b>Đặc điểm phân biệt:</b> ${item.features}</p></div>`).join('');
}

function checkAndDisplayAlerts(patientData) {
    const { restlessness, abdominalPain, oliguria } = patientData;
    const aiAlertsDiv = document.getElementById('aiAlerts');
    const aiAlertContent = document.getElementById('aiAlertContent');
    if(!aiAlertsDiv || !aiAlertContent) return;

    let alertMessages = [];

    if (restlessness) alertMessages.push('li bì/vật vã');
    if (abdominalPain) alertMessages.push('đau bụng tăng');
    if (oliguria) alertMessages.push('tiểu ít');

    if (alertMessages.length > 0) {
        aiAlertContent.textContent = `Bệnh nhân có dấu hiệu cảnh báo cần theo dõi sát: ${alertMessages.join(', ')}.`;
        aiAlertsDiv.classList.remove('hidden');
    } else {
        aiAlertsDiv.classList.add('hidden');
    }
}

// =================================================================
//                      UI & CHARTS
// =================================================================
function initializeRiskChart() {
    const ctx = document.getElementById('riskChart')?.getContext('2d');
    if(!ctx) return;
    if(riskChart) riskChart.destroy();
    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Nguy cơ thấp', 'Nguy cơ trung bình', 'Nguy cơ cao'],
            datasets: [{ data: [33, 33, 34], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Phân tích Nguy cơ' }, legend: { position: 'bottom' } } }
    });
}

function updateRiskChart(result) {
    if(!riskChart) return;
    let riskLevel = 'Thấp';
    if (result.severity === 'Sốt Dengue có dấu hiệu cảnh báo') riskLevel = 'Trung bình';
    if (result.severity === 'Sốt Dengue nặng') riskLevel = 'Cao';
    const riskData = { 'Thấp': [70, 20, 10], 'Trung bình': [30, 50, 20], 'Cao': [10, 30, 60] };
    riskChart.data.datasets[0].data = riskData[riskLevel] || [33,33,34];
    riskChart.update();
}

// =================================================================
//                      MONITORING TABLE
// =================================================================
function addMonitoringRecord() {
    const record = {
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        consciousness: document.getElementById('monitor_consciousness')?.value || '-',
        temperature: document.getElementById('monitor_temp')?.value || '-',
        pulse: document.getElementById('monitor_pulse')?.value || '-',
        bp: document.getElementById('monitor_bp')?.value || '-',
        spO2: document.getElementById('monitor_spo2')?.value || '-',
        urineOutput: document.getElementById('monitor_urine_output')?.value || '-',
        hematocrit: document.getElementById('monitor_hct')?.value || '-',
        intervention: document.getElementById('monitor_intervention')?.value || 'Theo dõi'
    };
    monitoringData.unshift(record);
    updateMonitoringTable();
    
    const fieldsToClear = ['monitor_consciousness', 'monitor_temp', 'monitor_pulse', 'monitor_bp', 'monitor_spo2', 'monitor_urine_output', 'monitor_hct', 'monitor_intervention'];
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
}

function updateMonitoringTable() {
    const tableBody = document.getElementById('monitoringTable');
    if(!tableBody) return;
    if (monitoringData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="border p-4 text-center text-gray-600">Chưa có dữ liệu theo dõi</td></tr>';
        return;
    }
    tableBody.innerHTML = monitoringData.map(r => `
        <tr class="text-center">
            <td class="border p-2">${r.time}</td>
            <td class="border p-2">${r.consciousness}</td>
            <td class="border p-2">${r.temperature ? r.temperature + '°C' : '-'}</td>
            <td class="border p-2">${r.pulse || '-'}/${r.bp || '-'}</td>
            <td class="border p-2">${r.spO2 ? r.spO2 + '%' : '-'}</td>
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
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}