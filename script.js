// Backend is deployed separately to Google Apps Script.

// --- FRONTEND APP SCRIPT ---
const app = {
    gasUrl: 'https://script.google.com/macros/s/AKfycbyzrRuyliWKlR5S80aGex8UP0n0uz9D9YYgBjILp433amUd87XqjLQzRJTqD0x5TkQVjw/exec',
    isAdmin: false,
    petitions: [], // Store current data
    
    init() {
        this.loadData();
    },

    switchTab(tabId) {
        document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');
        
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById('view-' + tabId).classList.remove('hidden');

        if (tabId === 'public') this.loadData();
    },

    showLoginModal() { document.getElementById('loginModal').classList.add('active'); },
    closeLoginModal() { document.getElementById('loginModal').classList.remove('active'); document.getElementById('loginError').classList.add('hidden'); },

    handleLogin(e) {
        e.preventDefault();
        const pwd = document.getElementById('adminPassword').value;
        if (pwd === '220985') {
            this.isAdmin = true;
            this.closeLoginModal();
            document.getElementById('btnLogin').classList.add('hidden');
            document.getElementById('btnLogout').classList.remove('hidden');
            document.getElementById('nav-admin').classList.remove('hidden');
            this.switchTab('admin');
        } else {
            document.getElementById('loginError').classList.remove('hidden');
        }
    },

    logout() {
        this.isAdmin = false;
        document.getElementById('btnLogin').classList.remove('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        document.getElementById('nav-admin').classList.add('hidden');
        this.switchTab('public');
    },

    // ===========================
    // DATA HANDLING
    // ===========================

    async loadData() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '<tr><td colspan="11" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';

        if (!this.gasUrl) {
            this.loadDemoData();
            return;
        }

        try {
            const response = await fetch(this.gasUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action: 'get_all' })
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                this.petitions = res.data;
                this.renderTable();
            } else {
                this.showErrorRow("Lỗi tải dữ liệu: " + (res.error || 'Unknown'));
            }
        } catch (err) {
            console.warn("GAS fetch failed, falling back to Demo", err);
            this.loadDemoData();
        }
    },

    loadDemoData() {
        // Mock data when no GAS is configured
        this.petitions = JSON.parse(localStorage.getItem('gov_demo_data')) || [
            { rowIndex: 2, "STT": 1, "Ngày gửi": "20/05/2026", "Người gửi": "Nguyễn Văn A", "Địa chỉ": "Thôn 1, Xã XYZ", "Nội dung đơn": "Đề nghị giải quyết tranh chấp đất đai giáp ranh", "Loại đơn": "Khiếu nại", "Đơn vị giải quyết": "Ban Địa giới", "Thời hạn giải quyết": "30 ngày", "Kết quả giải quyết": "Đang xử lý", "Chi tiết đơn": "#", "Chi tiết văn bản giải quyết": "" }
        ];
        this.renderTable();
    },

    formatDateStr(dateStr) {
        if (!dateStr) return '';
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            return dateStr.substring(0, 10);
        }
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            let day = String(d.getDate()).padStart(2, '0');
            let month = String(d.getMonth() + 1).padStart(2, '0');
            let year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }
        return String(dateStr);
    },

    renderTable(data = this.petitions) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">Chưa có dữ liệu đơn thư nào.</td></tr>';
            return;
        }

        data.forEach((row, index) => {
            let tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.onclick = () => this.showDetailModal(index);
            
            // Format some stuff manually
            let resolveSttClass = row["Kết quả giải quyết"] && row["Kết quả giải quyết"].includes("Đang") ? "status-pending" : "status-resolved";

            let truncatedContent = row["Nội dung đơn"] || '';
            if (truncatedContent.length > 80) {
                truncatedContent = truncatedContent.substring(0, 80) + '...';
            }

            let truncatedResult = row["Kết quả giải quyết"] || '';
            if (truncatedResult.length > 40) {
                truncatedResult = truncatedResult.substring(0, 40) + '...';
            }

            let formattedDate = this.formatDateStr(row["Ngày gửi"]);

            tr.innerHTML = `
                <td class="text-center"><strong>${row["STT"] || ''}</strong></td>
                <td>${formattedDate}</td>
                <td><strong>${row["Người gửi"] || ''}</strong></td>
                <td>${row["Địa chỉ"] || ''}</td>
                <td>${truncatedContent} <br><small style="color: var(--primary-red); font-size: 0.75rem;">(Nhấn xem chi tiết)</small></td>
                <td class="text-center"><span class="status-badge status-type">${row["Loại đơn"] || ''}</span></td>
                <td>${row["Đơn vị giải quyết"] || ''}</td>
                <td class="text-center">${row["Thời hạn giải quyết"] || ''}</td>
                <td class="text-center"><span class="status-badge ${resolveSttClass}" title="${row["Kết quả giải quyết"] || ''}">${truncatedResult}</span></td>
                <td class="text-center">
                    ${row["Chi tiết đơn"] ? `<a href="${row["Chi tiết đơn"]}" target="_blank" class="file-link" onclick="event.stopPropagation()"><i class="fa-solid fa-file-pdf"></i></a>` : ''}
                </td>
                <td class="text-center">
                    ${row["Chi tiết văn bản giải quyết"] ? `<a href="${row["Chi tiết văn bản giải quyết"]}" target="_blank" class="file-link" style="color:var(--success)" onclick="event.stopPropagation()"><i class="fa-solid fa-file-signature"></i></a>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.updateAdminResolutionDropdown();
    },

    showDetailModal(index) {
        const row = this.petitions[index];
        if(!row) return;

        let resolveSttClass = row["Kết quả giải quyết"] && row["Kết quả giải quyết"].includes("Đang") ? "status-pending" : "status-resolved";
        let formattedDate = this.formatDateStr(row["Ngày gửi"]);

        let html = '';
        if (this.isAdmin) {
            html = `
                <div class="detail-item">
                    <label>Người gửi:</label>
                    <input type="text" id="edit-nguoigui" class="gov-input mb-2" value="${row["Người gửi"] || ''}">
                    <label>Địa chỉ:</label>
                    <input type="text" id="edit-diachi" class="gov-input" value="${row["Địa chỉ"] || ''}">
                </div>
                <div class="detail-item">
                    <label>Ngày gửi (DD/MM/YYYY):</label>
                    <input type="text" id="edit-ngaygui" class="gov-input" value="${formattedDate}">
                </div>
                <div class="detail-item">
                    <label>Nội dung đơn / Phản ánh:</label>
                    <textarea id="edit-noidung" class="gov-input" rows="4">${row["Nội dung đơn"] || ''}</textarea>
                </div>
                <div class="detail-item">
                    <label>Loại đơn:</label>
                    <input type="text" id="edit-loaidon" class="gov-input mb-2" value="${row["Loại đơn"] || ''}">
                    
                    <label>Đơn vị xử lý:</label>
                    <input type="text" id="edit-donvi" class="gov-input mb-2" value="${row["Đơn vị giải quyết"] || ''}">
                    
                    <label>Hạn giải quyết:</label>
                    <input type="text" id="edit-han" class="gov-input" value="${row["Thời hạn giải quyết"] || ''}">
                </div>
                <div class="detail-item">
                    <label>Kết quả giải quyết:</label>
                    <textarea id="edit-ketqua" class="gov-input" rows="2">${row["Kết quả giải quyết"] || ''}</textarea>
                </div>
                <div class="detail-item">
                    <label>Tài liệu đính kèm:</label>
                    <p>
                        ${row["Chi tiết đơn"] ? `<a href="${row["Chi tiết đơn"]}" target="_blank" class="file-link"><i class="fa-solid fa-file-pdf"></i> Xem Đơn Gốc File PDF/Ảnh</a>` : 'Không có file đơn'}
                        ${row["Chi tiết văn bản giải quyết"] ? `<br><br><a href="${row["Chi tiết văn bản giải quyết"]}" target="_blank" class="file-link" style="color:var(--success)"><i class="fa-solid fa-file-signature"></i> Xem Văn Bản Giải Quyết File PDF/Word</a>` : ''}
                    </p>
                </div>
                <button class="btn-primary w-100" style="margin-top: 10px;" onclick="app.updatePetition(${index})"><i class="fa-solid fa-save"></i> Lưu Thay Đổi</button>
            `;
        } else {
            html = `
                <div class="detail-item">
                    <label>Người gửi:</label>
                    <p><strong>${row["Người gửi"] || ''}</strong> - ${row["Địa chỉ"] || ''}</p>
                </div>
                <div class="detail-item">
                    <label>Ngày gửi:</label>
                    <p>${formattedDate}</p>
                </div>
                <div class="detail-item">
                    <label>Nội dung đơn / Phản ánh:</label>
                    <p style="white-space: pre-wrap;">${row["Nội dung đơn"] || ''}</p>
                </div>
                <div class="detail-item">
                    <label>Trạng thái & Kết quả giải quyết:</label>
                    <p>
                        <span class="status-badge ${resolveSttClass} mb-3" style="font-size: 0.85rem">${row["Kết quả giải quyết"] || ''}</span>
                        <br>
                        <strong>Loại:</strong> ${row["Loại đơn"] || ''} | <strong>Đơn vị xử lý:</strong> ${row["Đơn vị giải quyết"] || ''} | <strong>Hạn:</strong> ${row["Thời hạn giải quyết"] || ''}
                    </p>
                </div>
                <div class="detail-item">
                    <label>Tài liệu đính kèm:</label>
                    <p>
                        ${row["Chi tiết đơn"] ? `<a href="${row["Chi tiết đơn"]}" target="_blank" class="file-link"><i class="fa-solid fa-file-pdf"></i> Xem Đơn Gốc File PDF/Ảnh</a>` : 'Không có file đơn'}
                        ${row["Chi tiết văn bản giải quyết"] ? `<br><br><a href="${row["Chi tiết văn bản giải quyết"]}" target="_blank" class="file-link" style="color:var(--success)"><i class="fa-solid fa-file-signature"></i> Xem Văn Bản Giải Quyết File PDF/Word</a>` : ''}
                    </p>
                </div>
            `;
        }
        
        document.getElementById('detailContent').innerHTML = html;
        document.getElementById('detailModal').classList.add('active');
    },

    async updatePetition(index) {
        const row = this.petitions[index];
        const btn = document.querySelector('#detailModal .btn-primary');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang cập nhật...';
        btn.disabled = true;

        const payload = {
            action: 'update_petition',
            rowIndex: row.rowIndex,
            ngayGui: document.getElementById('edit-ngaygui').value,
            nguoiGui: document.getElementById('edit-nguoigui').value,
            diaChi: document.getElementById('edit-diachi').value,
            noiDung: document.getElementById('edit-noidung').value,
            loaiDon: document.getElementById('edit-loaidon').value,
            donVi: document.getElementById('edit-donvi').value,
            thoiHan: document.getElementById('edit-han').value,
            ketQua: document.getElementById('edit-ketqua').value
        };

        try {
            const res = await fetch(this.gasUrl, { 
                method: "POST", 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            });
            const json = await res.json();
            
            // Update local
            row["Ngày gửi"] = payload.ngayGui;
            row["Người gửi"] = payload.nguoiGui;
            row["Địa chỉ"] = payload.diaChi;
            row["Nội dung đơn"] = payload.noiDung;
            row["Loại đơn"] = payload.loaiDon;
            row["Đơn vị giải quyết"] = payload.donVi;
            row["Thời hạn giải quyết"] = payload.thoiHan;
            row["Kết quả giải quyết"] = payload.ketQua;

            this.renderTable();
            this.closeDetailModal();
            alert("Đã lưu thay đổi thành công!");
        } catch (e) {
            console.error(e);
            alert("Đã xảy ra lỗi hoặc Google Apps Script chưa hỗ trợ tính năng cập nhật (Cần tạo action update_petition trong Code.gs).");
        } finally {
            if(btn) {
                btn.innerHTML = oldText;
                btn.disabled = false;
            }
        }
    },

    closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); },

    filterTable() {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const filtered = this.petitions.filter(p => {
            return (p["Người gửi"]||'').toLowerCase().includes(term) ||
                   (p["Nội dung đơn"]||'').toLowerCase().includes(term) ||
                   (p["Đơn vị giải quyết"]||'').toLowerCase().includes(term);
        });
        this.renderTable(filtered);
    },

    showErrorRow(msg) {
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="11" class="text-center text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${msg}</td></tr>`;
    },

    updateAdminResolutionDropdown() {
        const select = document.getElementById('aiMatchSelect');
        if(!select) return;
        select.innerHTML = '';
        this.petitions.forEach(row => {
            let opt = document.createElement('option');
            opt.value = row.rowIndex; 
            opt.textContent = `[Đơn ${row["STT"]}] ${row["Người gửi"]} - ${row["Nội dung đơn"].substring(0,30)}...`;
            select.appendChild(opt);
        });
    },

    // ===========================
    // UPLOAD & AI SIMULATION LOGIC
    // ===========================

    async toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    async handleUploadPetition(e) {
        e.preventDefault();
        const file = document.getElementById('filePetition').files[0];
        if (!file) return;

        const btn = document.getElementById('btnSubmitPetition');
        const status = document.getElementById('statusPetition');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên và phân tích bằng AI...';
        btn.disabled = true;

        try {
            const b64 = await this.toBase64(file);
            let payload = {
                action: "upload_petition",
                fileName: file.name,
                mimeType: file.type,
                base64: b64
            };

            if (this.gasUrl) {
                const res = await fetch(this.gasUrl, { 
                    method: "POST", 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload) 
                });
                const json = await res.json();
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> ${json.message}`;
            } else {
                // FALLBACK DEMO: Simulate AI processing
                await new Promise(r => setTimeout(r, 2000));
                let newRow = {
                    rowIndex: Date.now(), STT: this.petitions.length + 1,
                    "Ngày gửi": new Date().toLocaleDateString('vi-VN'),
                    "Người gửi": "Nguyễn AI Sinh", "Địa chỉ": "Khu 3, Xã Mô Phỏng", 
                    "Nội dung đơn": "AI Đã đọc tệp: " + file.name,
                    "Loại đơn": "Phản ánh", "Đơn vị giải quyết": "Ban Công An", "Thời hạn giải quyết": "15 ngày",
                    "Kết quả giải quyết": "Đang xử lý", "Chi tiết đơn": b64, "Chi tiết văn bản giải quyết": ""
                };
                this.petitions.push(newRow);
                localStorage.setItem('gov_demo_data', JSON.stringify(this.petitions));
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> [DEMO] Đã trích xuất và thêm mới thành công!`;
            }
            
            document.getElementById('formUploadPetition').reset();
            this.loadData();

        } catch (err) {
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-xmark"></i> Lỗi: ` + err.message;
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-microchip"></i> Xử Lý & Trích Xuất bằng Trí Tuệ Nhân Tạo';
            btn.disabled = false;
        }
    },

    async analyzeResolution() {
        const file = document.getElementById('fileResolution').files[0];
        if (!file) return alert("Vui lòng chọn file trước!");
        
        const btn = document.getElementById('btnAnalyzeResolution');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI đang tìm kiếm Đơn Thư...';
        
        // Simulating AI taking time to read and match
        setTimeout(() => {
            document.getElementById('matchPreview').classList.remove('hidden');
            btn.classList.add('hidden');
            document.getElementById('btnSubmitResolution').classList.remove('hidden');
        }, 1500);
    },

    async handleUploadResolution(e) {
        e.preventDefault();
        const file = document.getElementById('fileResolution').files[0];
        const targetRow = document.getElementById('aiMatchSelect').value;
        if (!file || !targetRow) return;

        const btn = document.getElementById('btnSubmitResolution');
        const status = document.getElementById('statusResolution');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên...';
        btn.disabled = true;

        try {
            const b64 = await this.toBase64(file);
            let payload = {
                action: "upload_resolution",
                fileName: file.name,
                mimeType: file.type,
                base64: b64,
                petitionRowIndex: parseInt(targetRow)
            };

            if (this.gasUrl) {
                const res = await fetch(this.gasUrl, { 
                    method: "POST", 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload) 
                });
                const json = await res.json();
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> ${json.message}`;
            } else {
                // FALLBACK DEMO
                await new Promise(r => setTimeout(r, 1500));
                let obj = this.petitions.find(p => p.rowIndex == targetRow);
                if(obj) {
                    obj["Kết quả giải quyết"] = "Đã giải quyết theo VB: " + file.name;
                    obj["Chi tiết văn bản giải quyết"] = b64;
                    localStorage.setItem('gov_demo_data', JSON.stringify(this.petitions));
                }
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> [DEMO] Đã cập nhật văn bản giải quyết!`;
            }
            
            document.getElementById('formUploadResolution').reset();
            document.getElementById('matchPreview').classList.add('hidden');
            btn.classList.add('hidden');
            document.getElementById('btnAnalyzeResolution').classList.remove('hidden');
            document.getElementById('btnAnalyzeResolution').innerHTML = '<i class="fa-solid fa-magnifying-glass-chart"></i> Phân tích Văn Bản';
            
            this.loadData();

        } catch (err) {
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-xmark"></i> Lỗi: ` + err.message;
            btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Xác Nhận Cập Nhật Kết Quả';
            btn.disabled = false;
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = app; // Ensure global accessibility for onclick handlers
    app.init();
    
    // File input label update handling
    document.getElementById('filePetition').addEventListener('change', function(e) {
        document.getElementById('labelFilePetition').innerText = e.target.files[0] ? e.target.files[0].name : "Nhấn để chọn file hoặc kéo thả vào đây";
    });
    document.getElementById('fileResolution').addEventListener('change', function(e) {
        document.getElementById('labelFileResolution').innerText = e.target.files[0] ? e.target.files[0].name : "Nhấn để chọn file văn bản giải quyết";
    });
});
