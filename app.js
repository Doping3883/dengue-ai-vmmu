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
    document.getElementById('height').addEventListener('input', calculateBMI);
    document.getElementById('weight').addEventListener('input', calculateBMI);
    
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
        
        clearForm(false);
        
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
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.tagName.toLowerCase() !== 'button' && input.id !== 'patientSelect') {
            input.value = '';
        }
    });

    const dynamicSections = ['diagnosisResult', 'treatmentPlan', 'differentialDiagnosis', 'dischargeResult'];
    dynamicSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<p class="text-gray-500">Chờ chẩn đoán...</p>`;
    });
    
    const hiddenSections = ['realTimeAlert', 'consultationAlert', 'shockManagementSection'];
    hiddenSections.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    
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

function calculateBMI() {
    const heightEl = document.getElementById('height');
    const weightEl = document.getElementById('weight');
    const bmiEl = document.getElementById('bmi');
    if (!heightEl || !weightEl || !bmiEl) return;

    const height = parseFloat(heightEl.value);
    const weight = parseFloat(weightEl.value);

    if (height > 0 && weight > 0) {
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        bmiEl.value = bmi.toFixed(2);
    } else {
        bmiEl.value = '';
    }
}
        
// =================================================================
//                      DIAGNOSIS & GUIDANCE
// =================================================================

function getPatientDataFromForm() {
    const data = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return data;
}

function performDiagnosis() {
    const patientData = getPatientDataFromForm();
    const diagnosisResult = analyzeDengueSymptoms(patientData);

    displayDiagnosisResult(diagnosisResult);
    generateTreatmentPlan(patientData, diagnosisResult);
    updateRiskChart(diagnosisResult);
    checkAndDisplayAlerts(patientData);
    generateDifferentialDiagnosis(patientData, diagnosisResult);
    
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

    if (severity === 'Sốt Dengue' && hasRiskFactors) {
        hospitalizationRecommended = true;
    }
    
    return { stage, severity, warningSignCount, hospitalizationRecommended, hasRiskFactors };
}

function displayDiagnosisResult(result) {
    const resultDiv = document.getElementById('diagnosisResult');
    if (!resultDiv) return;

    let recommendationText = '';
    if (result.hospitalizationRecommended) {
        recommendationText = `<div class="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-semibold">
            <i class="fas fa-hospital-symbol mr-2"></i>Gợi ý: Cần nhập viện theo dõi ${result.hasRiskFactors ? 'do có yếu tố nguy cơ.' : '.'}
        </div>`;
    }

    resultDiv.innerHTML = `
        <div class="space-y-2">
            <div><i class="fas fa-diagnosis mr-2 text-blue-600"></i><strong>Chẩn đoán:</strong> <span class="font-semibold">${result.severity}</span></div>
            <div><i class="fas fa-clock mr-2 text-gray-600"></i><strong>Giai đoạn:</strong> ${result.stage}</div>
        </div>
        ${recommendationText}
    `;
}

function generateTreatmentPlan(patientData, diagnosisResult) {
    const treatmentDiv = document.getElementById('treatmentPlan');
    if (!treatmentDiv) return;

    const { weight, adjustedWeight } = patientData;
    const effectiveWeight = adjustedWeight > 0 ? adjustedWeight : weight;
    const { severity } = diagnosisResult;
    let html = '';

    const paracetamolDose = (weight > 0) 
        ? `<li><b>Hạ sốt:</b> Paracetamol ${10 * weight}-${15 * weight} mg/lần.</li>` 
        : '<li><b>Hạ sốt:</b> Paracetamol liều 10-15 mg/kg/lần.</li>';

    switch (severity) {
        case 'Sốt Dengue':
            html = `<div class="bg-green-50 p-4 rounded-lg"><h3 class="font-semibold text-green-800">Phác đồ Nhóm A (Ngoại trú)</h3><ul class="list-disc list-inside text-green-700">${paracetamolDose}<li><b>Bù dịch:</b> Uống nhiều Oresol, nước trái cây.</li></ul></div>`;
            break;
        case 'Sốt Dengue có dấu hiệu cảnh báo':
            const initialFluid = (5 * effectiveWeight).toFixed(0);
            html = `<div class="bg-yellow-50 p-4 rounded-lg"><h3 class="font-semibold text-yellow-800">Phác đồ Nhóm B (Nội trú)</h3><ul class="list-disc list-inside text-yellow-700">${paracetamolDose}<li><b>Truyền dịch:</b> Ringer Lactate hoặc NaCl 0,9%.</li><li><b>Liều ban đầu:</b> ~${initialFluid} ml/giờ (5 ml/kg/giờ), sau đó điều chỉnh theo đáp ứng.</li></ul></div>`;
            break;
        case 'Sốt Dengue nặng':
            html = `<div class="bg-red-50 p-4 rounded-lg"><h3 class="font-semibold text-red-800">Phác đồ Nhóm C (Cấp cứu)</h3><p>Xem chi tiết tại mục "Hướng dẫn Xử trí Sốc Dengue".</p></div>`;
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
    } else {
        diffDiv.innerHTML = suggestions.map(item => `<div class="p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg"><h4 class="font-semibold text-indigo-800">${item.disease}</h4><p class="text-sm text-indigo-700"><b>Đặc điểm phân biệt:</b> ${item.features}</p></div>`).join('');
    }
}

function checkAndDisplayAlerts(patientData) {
    const { restlessness, abdominalPain, oliguria } = patientData;
    const aiAlertsDiv = document.getElementById('realTimeAlert');
    const aiAlertContent = document.getElementById('realTimeAlertContent');
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
        bp: document.getElementById('monitor_bp')?.value || '-',
        pulse: document.getElementById('monitor_pulse')?.value || '-',
        hct: document.getElementById('monitor_hct')?.value || '-',
        platelets: document.getElementById('monitor_platelets')?.value || '-',
        intervention: document.getElementById('monitor_intervention')?.value || 'Theo dõi'
    };
    monitoringData.unshift(record);
    updateMonitoringTable();
    
    const fieldsToClear = ['monitor_bp', 'monitor_pulse', 'monitor_hct', 'monitor_platelets', 'monitor_intervention'];
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
}

function updateMonitoringTable() {
    const tableBody = document.getElementById('monitoringTable');
    if(!tableBody) return;
    if (monitoringData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="border p-4 text-center text-gray-600">Chưa có dữ liệu theo dõi</td></tr>';
        return;
    }
    tableBody.innerHTML = monitoringData.map(r => `
        <tr class="text-center">
            <td class="border p-2">${r.time}</td>
            <td class="border p-2">${r.pulse}/${r.bp}</td>
            <td class="border p-2">${r.hct ? r.hct + '%' : '-'}</td>
            <td class="border p-2">${r.platelets || '-'}</td>
            <td class="border p-2 text-left">${r.intervention}</td>
        </tr>`).join('');
}

// =================================================================
//                      NEW FEATURES
// =================================================================
function evaluateDischarge() {
    const resultDiv = document.getElementById('dischargeResult');
    const criteria = document.querySelectorAll('#dischargeChecklist input[type="checkbox"]');
    let allMet = true;
    criteria.forEach(criterion => {
        if (!criterion.checked) {
            allMet = false;
        }
    });

    if (allMet) {
        resultDiv.innerHTML = `<div class="text-center text-green-700"><i class="fas fa-check-circle fa-2x mb-2"></i><p class="font-semibold">Bệnh nhân đủ tiêu chuẩn xuất viện.</p></div>`;
        resultDiv.className = 'p-4 bg-green-100 rounded-lg flex items-center justify-center';
    } else {
        resultDiv.innerHTML = `<div class="text-center text-red-700"><i class="fas fa-times-circle fa-2x mb-2"></i><p class="font-semibold">CHƯA đủ tiêu chuẩn xuất viện.</p></div>`;
        resultDiv.className = 'p-4 bg-red-100 rounded-lg flex items-center justify-center';
    }
}

function exportExcel() {
    if (monitoringData.length === 0) {
        alert("Chưa có dữ liệu theo dõi để xuất file Excel.");
        return;
    }
    const patientName = document.getElementById('patientName').value || "BenhNhan";
    const ws = XLSX.utils.json_to_sheet(monitoringData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TheoDoi");
    XLSX.writeFile(wb, `TheoDoi_${patientName.replace(/ /g, '_')}.xlsx`);
}

// =================================================================
//              PWA SERVICE WORKER REGISTRATION
// =================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('ServiceWorker registered.'))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
}
