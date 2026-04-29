<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plex CRM - Pakke Administration</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .modal { display: none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); }
        .modal-content { background-color: white; margin: 0.5% auto; padding: 30px; border-radius: 12px; width: 90%; max-width: 800px; border-top: 8px solid #10b981; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        label { display: block; font-size: 0.65rem; font-weight: 800; color: #4b5563; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
        input { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-size: 0.85rem; background-color: #f9fafb; margin-bottom: 10px; font-weight: 600; }
        .nav-active { background-color: #dc2626 !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
        .section-title { border-bottom: 2px solid #f3f4f6; margin: 20px 0 12px 0; padding-bottom: 6px; color: #111827; font-weight: 900; text-transform: uppercase; font-size: 0.85rem; }
        tr.clickable { cursor: pointer; transition: all 0.1s; }
        tr.clickable:hover { background-color: #f0fdf4 !important; }
        
        .table-wrapper { height: calc(100vh - 180px); overflow: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: white; }
        thead th { position: sticky; top: 0; z-index: 20; background-color: #f0fdf4 !important; box-shadow: 0 1px 0 #10b981; }
    </style>
</head>
<body class="bg-gray-100 flex h-screen overflow-hidden text-slate-900 font-sans">

    <script>
        // --- SIKKERHED OG RETTIGHEDS-STYRING ---
        const user = JSON.parse(localStorage.getItem('crm_user'));
        if(!user) { window.location.href = '/login.html'; }

        function checkAccess() {
            if (user.type === 'admin') return; 
            const allowedPages = user.menu_access ? user.menu_access.split(',') : ['index.html'];
            document.querySelectorAll('#sidebar-nav a').forEach(link => {
                const href = link.getAttribute('href');
                if (!allowedPages.includes(href)) { link.style.display = 'none'; }
            });
            if (!allowedPages.includes('settings.html')) { window.location.href = '/index.html'; }
        }
        function logout() { localStorage.removeItem('crm_user'); window.location.href = '/login.html'; }
    </script>

    <!-- SIDEBAR -->
    <div class="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl font-bold uppercase text-[10px] tracking-wider">
        <div class="p-6 text-2xl font-black border-b border-slate-800 italic tracking-tighter text-red-600">⦿ PLEX CRM</div>
        <nav id="sidebar-nav" class="flex-1 p-4 space-y-1">
            <a href="index.html" class="nav-item block p-3 hover:bg-slate-800 rounded text-white">👥 <span data-dk="Klient-Oversigt" data-uk="Client Overview">Klient-Oversigt</span></a>
            <a href="approvals.html" id="nav-approvals" class="nav-item block p-3 hover:bg-slate-800 rounded flex justify-between items-center text-orange-400 italic">
                <span>⏳ <span data-dk="Godkendelser" data-uk="Approvals">Godkendelser</span></span>
                <span class="bg-orange-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black" id="badge-approvals">0</span>
            </a>
            <a href="resellers.html" id="nav-resellers" class="nav-item block p-3 hover:bg-slate-800 rounded text-blue-400 italic font-black">👤 <span data-dk="Reseller Styring" data-uk="Reseller Mgmt">Reseller Styring</span></a>
            <a href="commission.html" id="nav-commission" class="nav-item block p-3 hover:bg-slate-800 rounded text-yellow-500 font-black italic">💰 <span data-dk="Provision & Tal" data-uk="Profit & Data">Provision & Tal</span></a>
            <a href="settings.html" id="nav-settings" class="nav-item block p-3 bg-red-600 rounded nav-active text-white font-black italic uppercase">⚙️ <span data-dk="Pakke Indstillinger" data-uk="Package Settings">Pakke Indstillinger</span></a>
            <a href="payments.html" id="nav-payments" class="nav-item block p-3 hover:bg-slate-800 rounded text-slate-500 font-black italic uppercase">💳 <span data-dk="Betalinger" data-uk="Payments">Betalinger</span></a>
            
            <button onclick="logout()" class="w-full text-left p-3 hover:bg-red-900/30 text-red-500 mt-10 border-t border-slate-800 transition-colors flex items-center italic uppercase font-black text-[10px]">
                <span class="mr-2 text-lg">🔒</span> Log ud
            </button>
        </nav>
        <div class="p-4 border-t border-slate-800 bg-black/20 text-center italic font-black text-[9px] text-slate-500 uppercase">Admin: Brian</div>
    </div>

    <!-- MAIN AREA -->
    <div class="flex-1 flex flex-col overflow-hidden not-italic">
        <header class="bg-white shadow-sm p-5 flex justify-between items-center px-10 border-b">
            <div class="flex items-center space-x-8 flex-1">
                <h2 class="text-2xl font-black uppercase italic tracking-tighter text-emerald-600 italic font-black">Pakke Administration</h2>
                <div class="relative w-80 italic font-bold"><input type="text" id="pkgSearch" onkeyup="render()" placeholder="SØG PAKKE..." class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-4 text-[11px] outline-none focus:border-emerald-500 transition-all mb-0 shadow-inner"></div>
            </div>
            <button onclick="openModal(false)" class="bg-emerald-600 text-white px-10 py-3 rounded shadow-2xl hover:bg-emerald-700 transition uppercase text-[11px] font-black italic shadow-lg">+ Ny Pakke</button>
        </header>

        <main class="flex-1 p-10 overflow-hidden font-black uppercase italic">
            <div class="table-wrapper shadow-2xl border border-emerald-100">
                <table class="w-full text-left">
                    <thead class="bg-emerald-50 text-emerald-800 text-[10px] tracking-widest border-b border-emerald-100 italic">
                        <tr><th class="p-5">Beskrivelse</th><th class="p-5 text-red-600 italic">Kost (€)</th><th class="p-5 text-blue-600">Salg (€)</th><th class="p-5 text-orange-500 italic">Agent (€)</th><th class="p-5 text-blue-400 italic">Reseller (€)</th><th class="p-5 text-emerald-600 underline font-black">Netto Profit (€)</th><th class="p-5 text-center">Handling</th></tr>
                    </thead>
                    <tbody id="settings-table-body" class="text-[12px] divide-y divide-gray-50 tracking-tight"></tbody>
                </table>
            </div>
        </main>
    </div>

    <!-- MODAL -->
    <div id="pkgModal" class="modal">
        <div class="modal-content shadow-2xl">
            <h2 class="text-3xl italic font-black border-b pb-4 mb-8 text-emerald-600 uppercase tracking-tighter" id="modal-title">Rediger Pakke</h2>
            <form id="pkgForm" onsubmit="savePkg(event)" class="space-y-6 italic font-black">
                <input type="hidden" id="edit-id">
                <div><label>Beskrivelse</label><input type="text" id="edit-name" required></div>
                <div class="grid grid-cols-2 gap-6 uppercase">
                    <div><label class="text-red-500">Kostpris (€)</label><input type="number" id="edit-cost" step="0.01"></div>
                    <div><label class="text-blue-600">Salgspris (€)</label><input type="number" id="edit-sale" step="0.01"></div>
                    <div><label class="text-orange-500">Agent Provision (€)</label><input type="number" id="edit-agent" step="0.01" class="bg-orange-50"></div>
                    <div><label class="text-blue-400">Reseller Provision (€)</label><input type="number" id="edit-reseller" step="0.01" class="bg-blue-50"></div>
                </div>
                <div class="mt-12 pt-6 border-t flex justify-between items-center italic">
                    <button type="button" id="del-btn" onclick="deletePkg()" class="bg-red-100 text-red-600 px-8 py-4 rounded-xl font-black uppercase text-[10px] hidden hover:bg-red-200">Slet Pakke 🗑️</button>
                    <div class="flex space-x-6 ml-auto font-black uppercase text-[11px]">
                        <button type="button" onclick="closeModal()" class="text-gray-400">Annuller</button>
                        <button type="submit" class="bg-emerald-600 text-white px-12 py-4 rounded-xl shadow-2xl hover:bg-emerald-800 transition tracking-widest">Gem Konfiguration</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <script>
        let packages = [];
        let currentId = null;

        window.onload = function() { checkAccess(); fetchPkgs(); };

        async function fetchPkgs() {
            try {
                const res = await fetch('/api/packages');
                packages = await res.json();
                render();
            } catch(e) { console.error(e); }
        }

        function render() {
            const term = document.getElementById('pkgSearch').value.toLowerCase();
            document.getElementById('settings-table-body').innerHTML = packages.filter(p => p.name.toLowerCase().includes(term)).map(p => {
                const profit = (parseFloat(p.sale_eur) - parseFloat(p.cost) - parseFloat(p.agent_comm) - parseFloat(p.reseller_comm)).toFixed(2);
                return `
                    <tr class="hover:bg-emerald-50 transition border-b clickable" onclick="openModal(true, ${p.id})">
                        <td class="p-5 font-black text-slate-800">#${p.id} ${p.name}</td>
                        <td class="p-5 text-red-500 font-mono italic font-black text-sm">€ ${parseFloat(p.cost).toFixed(2)}</td>
                        <td class="p-5 text-blue-700 font-black font-mono text-sm">€ ${parseFloat(p.sale_eur).toFixed(2)}</td>
                        <td class="p-5 text-orange-500 italic text-[10px] font-mono">€ ${parseFloat(p.agent_comm).toFixed(2)}</td>
                        <td class="p-5 text-blue-400 italic text-[10px] font-mono">€ ${parseFloat(p.reseller_comm).toFixed(2)}</td>
                        <td class="p-5 text-emerald-600 font-black underline italic font-mono text-sm">€ ${profit}</td>
                        <td class="p-5 text-center text-xl text-gray-200 font-light">⚙️</td>
                    </tr>`;
            }).join('');
        }

        function openModal(isEdit, id) {
            currentId = id;
            document.getElementById('pkgModal').style.display = 'block';
            const delBtn = document.getElementById('del-btn');
            if(isEdit) {
                const p = packages.find(x => x.id === id);
                document.getElementById('edit-id').value = p.id;
                document.getElementById('edit-name').value = p.name;
                document.getElementById('edit-cost').value = p.cost;
                document.getElementById('edit-sale').value = p.sale_eur;
                document.getElementById('edit-agent').value = p.agent_comm;
                document.getElementById('edit-reseller').value = p.reseller_comm;
                delBtn.classList.remove('hidden');
                document.getElementById('modal-title').innerText = "Rediger Pakke #" + p.id;
            } else {
                document.getElementById('pkgForm').reset();
                document.getElementById('edit-id').value = '';
                delBtn.classList.add('hidden');
                document.getElementById('modal-title').innerText = "Opret Ny Pakke";
            }
        }

        async function savePkg(e) {
            e.preventDefault();
            const data = {
                id: document.getElementById('edit-id').value,
                name: document.getElementById('edit-name').value,
                cost: document.getElementById('edit-cost').value,
                sale_eur: document.getElementById('edit-sale').value,
                agent_comm: document.getElementById('edit-agent').value,
                reseller_comm: document.getElementById('edit-reseller').value
            };
            await fetch('/api/packages/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
            closeModal(); fetchPkgs();
        }

        async function deletePkg() {
            if(!confirm('Slet permanent?')) return;
            await fetch('/api/packages/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id: currentId}) });
            closeModal(); fetchPkgs();
        }

        function closeModal() { document.getElementById('pkgModal').style.display = 'none'; }
    </script>
</body>
</html>  
