// Backend is deployed separately to Google Apps Script.
import { GoogleGenAI } from "@google/genai";

// --- FRONTEND APP SCRIPT ---
const app = {
    gasUrl: 'https://script.google.com/macros/s/AKfycbzuhsR8_n6XhcFJRISZ7dwnxwO_0xO38te1QNrpj8_pCIjsO0MXS4UkE0oCcnvnj20f5g/exec',
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
                this.sortPetitionsByDate();
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
        this.sortPetitionsByDate();
        this.renderTable();
    },

    parseDateForSort(dateStr) {
        if (!dateStr) return 0;
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            let parts = dateStr.substring(0, 10).split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
        }
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.getTime();
        }
        return 0;
    },

    sortPetitionsByDate() {
        this.petitions.sort((a, b) => {
            let tA = this.parseDateForSort(a["Ngày gửi"]);
            let tB = this.parseDateForSort(b["Ngày gửi"]);
            return tB - tA;
        });
        this.petitions.forEach((p, index) => {
            p["STT"] = index + 1;
        });
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
            const realIndex = this.petitions.indexOf(row);
            tr.onclick = () => this.showDetailModal(realIndex);
            
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
                <td class="text-center"><strong>${index + 1}</strong></td>
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
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn-primary w-100" onclick="app.updatePetition(${index})"><i class="fa-solid fa-save"></i> Lưu Thay Đổi</button>
                    <button class="btn-primary w-100" style="background-color: var(--primary-red);" onclick="app.deletePetition(${index})"><i class="fa-solid fa-trash"></i> Xóa Đơn</button>
                </div>
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

    async deletePetition(index) {
        if (!confirm("Bạn có chắc chắn muốn xóa đơn này không?")) return;
        
        const row = this.petitions[index];
        const btn = document.querySelectorAll('#detailModal .btn-primary')[1];
        const oldText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xóa...';
        btn.disabled = true;

        const payload = {
            action: 'delete_petition',
            rowIndex: row.rowIndex
        };

        try {
            const res = await fetch(this.gasUrl, { 
                method: "POST", 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            });
            const json = await res.json();
            
            // Update local
            this.petitions.splice(index, 1);
            this.renderTable();
            this.closeDetailModal();
            alert("Đã xóa đơn thành công!");
        } catch (e) {
            console.error(e);
            alert("Đã xảy ra lỗi hoặc Google Apps Script chưa hỗ trợ tính năng xóa (Cần tạo action delete_petition trong Code.gs).");
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

    updateAdminResolutionDropdown(filteredData = this.petitions) {
        const select = document.getElementById('aiMatchSelect');
        if(!select) return;
        select.innerHTML = '';
        filteredData.forEach(row => {
            let opt = document.createElement('option');
            opt.value = row.rowIndex; 
            opt.textContent = `[Đơn ${row["STT"]}] ${row["Người gửi"]} - ${row["Nội dung đơn"].substring(0,30)}...`;
            select.appendChild(opt);
        });
    },

    filterAdminResolutionDropdown() {
        const term = document.getElementById('aiMatchSearch').value.toLowerCase();
        const filtered = this.petitions.filter(p => {
            return (p["Người gửi"]||'').toLowerCase().includes(term) ||
                   (p["Nội dung đơn"]||'').toLowerCase().includes(term);
        });
        this.updateAdminResolutionDropdown(filtered);
    },

    // ===========================
    // UPLOAD & AI SIMULATION LOGIC
    // ===========================

    async toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1] || reader.result;
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
        });
    },

    pendingPetitionFile: null,
    pendingResolutionFile: null,

    async handleUploadPetition(e) {
        e.preventDefault();
        const file = document.getElementById('filePetition').files[0];
        if (!file) return;

        const btn = document.getElementById('btnSubmitPetition');
        const status = document.getElementById('statusPetition');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích bằng AI...';
        btn.disabled = true;
        document.getElementById('aiExtractParamsPetition').classList.add('hidden');
        status.innerHTML = "";
        status.className = "status-msg";

        try {
            const b64 = await this.toBase64(file);
            this.pendingPetitionFile = {
                fileName: file.name,
                mimeType: file.type,
                base64: b64
            };

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `Hãy đóng vai một chuyên gia phân tích đơn thư hành chính. Đọc tài liệu đính kèm và trích xuất các thông tin sau dưới định dạng JSON chính xác:
{
  "ngayGui": "Ngày/tháng/năm trên đơn (nếu có, không thì để trống)",
  "nguoiGui": "Họ và tên người đứng đơn",
  "diaChi": "Địa chỉ người gửi",
  "noiDung": "Tóm tắt ngắn gọn nội dung đơn (khoảng 2-3 câu)",
  "loaiDon": "Phân loại đơn (Khiếu nại / Tố cáo / Kiến nghị, phản ánh)"
}`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                    prompt,
                    { inlineData: { mimeType: file.type, data: b64.split(",")[1] || b64 } }
                ],
                config: { responseMimeType: "application/json" }
            });
            const responseText = response.text;
            const jsonStr = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
            const data = JSON.parse(jsonStr) || {};

            document.getElementById('ai-ngayGui').value = data.ngayGui || "";
            document.getElementById('ai-nguoiGui').value = data.nguoiGui || "";
            document.getElementById('ai-diaChi').value = data.diaChi || "";
            document.getElementById('ai-noiDung').value = data.noiDung || "";
            document.getElementById('ai-loaiDon').value = data.loaiDon || "Kiến nghị, phản ánh";
            document.getElementById('ai-donVi').value = data.donVi || "UBND Cấp Xã";
            document.getElementById('ai-thoiHan').value = data.thoiHan || "30 ngày";

            document.getElementById('aiExtractParamsPetition').classList.remove('hidden');
            status.className = "status-msg success";
            status.innerHTML = `<i class="fa-solid fa-check"></i> Trích xuất dữ liệu thành công. Vui lòng kiểm tra và lưu vào hệ thống!`;
        } catch (error) {
            console.error(error);
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Lỗi: ${error.message}`;
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-microchip"></i> Xử Lý & Trích Xuất bằng Trí Tuệ Nhân Tạo';
            btn.disabled = false;
        }
    },

    async confirmAndUploadPetition() {
        const btn = document.getElementById('btnConfirmAndUploadPetition');
        const status = document.getElementById('statusPetition');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên GAS...';
        btn.disabled = true;

        const payload = {
            action: "upload_petition",
            fileName: this.pendingPetitionFile.fileName,
            mimeType: this.pendingPetitionFile.mimeType,
            base64: this.pendingPetitionFile.base64,
            ngayGui: document.getElementById('ai-ngayGui').value,
            nguoiGui: document.getElementById('ai-nguoiGui').value,
            diaChi: document.getElementById('ai-diaChi').value,
            noiDung: document.getElementById('ai-noiDung').value,
            loaiDon: document.getElementById('ai-loaiDon').value,
            donVi: document.getElementById('ai-donVi').value,
            thoiHan: document.getElementById('ai-thoiHan').value
        };

        try {
            const res = await fetch(this.gasUrl, { 
                method: "POST", 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            });
            const json = await res.json();
            console.log("Upload petition response:", json);
            if (json.status === 'success') {
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> Đã lưu vào trang tính thành công!`;
                
                document.getElementById('formUploadPetition').reset();
                document.getElementById('aiExtractParamsPetition').classList.add('hidden');
                this.pendingPetitionFile = null;

                await this.loadData();
            } else {
                throw new Error(json.message || json.error || "GAS returned error");
            }
        } catch (error) {
            console.error(error);
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Lỗi lưu GAS: ${error.message}`;
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Lưu vào Hệ Thống';
            btn.disabled = false;
        }
    },

    async analyzeResolution() {
        const file = document.getElementById('fileResolution').files[0];
        if (!file) return alert("Vui lòng chọn file trước!");
        
        const btn = document.getElementById('btnAnalyzeResolution');
        const status = document.getElementById('statusResolution');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI đang phân tích và tìm kiếm...';
        btn.disabled = true;
        document.getElementById('matchPreview').classList.add('hidden');
        status.innerHTML = "";
        status.className = "status-msg";

        try {
            const b64 = await this.toBase64(file);
            this.pendingResolutionFile = {
                fileName: file.name,
                mimeType: file.type,
                base64: b64
            };

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `Hãy đọc văn bản giải quyết đơn thư đính kèm và trích xuất các thông tin sau dưới định dạng JSON:
{
  "tomTatThongTin": "Tóm tắt ngắn gọn nội dung giải quyết"
}`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                    prompt,
                    { inlineData: { mimeType: file.type, data: b64.split(",")[1] || b64 } }
                ],
                config: { responseMimeType: "application/json" }
            });
            const responseText = response.text;
            const jsonStr = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
            const data = JSON.parse(jsonStr) || {};

            document.getElementById('ai-tomTatGiaiQuyet').value = data.tomTatThongTin || "";

            let aiSelect = document.getElementById('aiMatchSelect');
            aiSelect.innerHTML = '<option value="">-- Vui lòng chọn một Đơn thư --</option>';
            this.petitions.forEach(p => {
                aiSelect.innerHTML += `<option value="${p.rowIndex}">[${p["Ngày gửi"]}] ${p["Người gửi"]} - ${p["Loại đơn"]}</option>`;
            });

            document.getElementById('matchPreview').classList.remove('hidden');
            btn.classList.add('hidden');
            document.getElementById('btnSubmitResolution').classList.remove('hidden');
            status.className = "status-msg success";
            status.innerHTML = `<i class="fa-solid fa-check"></i> Trích xuất và đề xuất thành công!`;
        } catch (error) {
            console.error(error);
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Lỗi: ${error.message}`;
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart"></i> Phân tích Văn Bản';
            btn.disabled = false;
        }
    },

    async confirmAndUploadResolution() {
        const targetRow = document.getElementById('aiMatchSelect').value;
        if (!this.pendingResolutionFile || !targetRow) return alert("Vui lòng chọn file và đơn thư liên kết.");

        const btn = document.getElementById('btnSubmitResolution');
        const status = document.getElementById('statusResolution');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên GAS...';
        btn.disabled = true;

        const payload = {
            action: "upload_resolution",
            fileName: this.pendingResolutionFile.fileName,
            mimeType: this.pendingResolutionFile.mimeType,
            base64: this.pendingResolutionFile.base64,
            ketQua: document.getElementById('ai-tomTatGiaiQuyet').value,
            petitionRowIndex: parseInt(targetRow)
        };

        try {
            const res = await fetch(this.gasUrl, { 
                method: "POST", 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            });
            const json = await res.json();
            console.log("Upload resolution response:", json);
            if (json.status === 'success') {
                status.className = "status-msg success";
                status.innerHTML = `<i class="fa-solid fa-check"></i> ${json.message || "Đã lưu thành công!"}`;
                
                document.getElementById('formUploadResolution').reset();
                document.getElementById('matchPreview').classList.add('hidden');
                document.getElementById('btnSubmitResolution').classList.add('hidden');
                document.getElementById('btnAnalyzeResolution').classList.remove('hidden');
                this.pendingResolutionFile = null;

                await this.loadData();
            } else {
                throw new Error(json.message || json.error || "GAS returned error");
            }
        } catch (e) {
            console.error(e);
            status.className = "status-msg error";
            status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${e.message}`;
        } finally {
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
