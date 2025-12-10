/* src/script/pdf.js */

// Global access to PDF lib
window.jsPDF = window.jspdf.jsPDF;

function setupPdfListeners() {
    const downloadBtn = document.getElementById('downloadScheduleBtn');
    if(downloadBtn) downloadBtn.addEventListener('click', openPdfPreview);
    
    const closeBtn = document.getElementById('closePdfModal');
    if(closeBtn) closeBtn.addEventListener('click', closePdfPreview);

    const cancelBtn = document.getElementById('cancelPdfBtn');
    if(cancelBtn) cancelBtn.addEventListener('click', closePdfPreview);

    const confirmBtn = document.getElementById('confirmDownloadPdf');
    if(confirmBtn) confirmBtn.addEventListener('click', generateFinalPdf);

    const trimToggle = document.getElementById('pdfTrimToggle');
    if(trimToggle) {
        trimToggle.addEventListener('change', renderPdfGrid);
    }
}

function openPdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    const printContainer = document.getElementById('printContainer');
    
    // Base width for high resolution
    if (printContainer) printContainer.style.minWidth = "1400px";

    const trimToggle = document.getElementById('pdfTrimToggle');
    if(trimToggle) trimToggle.checked = false; 

    renderPdfGrid();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function renderPdfGrid() {
    const printGrid = document.getElementById('printGrid');
    const dateLabel = document.getElementById('printDate');
    const trimToggle = document.getElementById('pdfTrimToggle');
    
    let startH = 7;
    let endH = 20;

    // Smart Crop Logic
    if (trimToggle && !trimToggle.checked) {
        let foundMin = 20; let foundMax = 7; let hasData = false;
        for (let h = 7; h <= 20; h++) {
            for (let d = 0; d < 7; d++) {
                if (localStorage.getItem(`schedule-${d}-${h}`)) {
                    hasData = true;
                    if (h < foundMin) foundMin = h;
                    if (h > foundMax) foundMax = h;
                }
            }
        }
        if (hasData) { startH = foundMin; endH = foundMax; }
    }

    // --- ROW HEIGHT CALCULATION ---
    // A4 Aspect Ratio is ~1.41 (Width/Height) -> Height is ~70% of width.
    // Container Width = 1400px. Target Height ~ 990px.
    // Header is approx 50px. Available for rows: 940px.
    const rowCount = endH - startH + 1;
    let minRowHeight = 80; // Default minimum
    
    // Calculate expanded height to fill page
    let dynamicRowHeight = Math.floor(940 / rowCount);
    // Ensure it doesn't get too small (if full day) or ridiculously huge (if 1 row)
    if (dynamicRowHeight < 80) dynamicRowHeight = 80; 
    if (dynamicRowHeight > 180) dynamicRowHeight = 180; // Cap max height

    const _days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    
    dateLabel.innerText = "Generated on " + new Date().toLocaleDateString();
    printGrid.innerHTML = '';

    // Header
    const headerRow = document.createElement('div');
    headerRow.className = 'print-header-row';
    headerRow.innerHTML = `<div class="p-3 text-center flex items-center justify-center">Time</div>`; 
    _days.forEach(d => {
        headerRow.innerHTML += `<div class="p-3 text-center border-l border-gray-700 flex items-center justify-center">${d}</div>`;
    });
    printGrid.appendChild(headerRow);

    // Rows
    for (let h = startH; h <= endH; h++) {
        const row = document.createElement('div');
        row.className = 'print-row';
        
        const timeCol = document.createElement('div');
        timeCol.className = 'print-time-col';
        timeCol.innerText = `${h}:00`;
        // Apply Dynamic Height
        timeCol.style.height = `${dynamicRowHeight}px`;
        row.appendChild(timeCol);

        for (let d = 0; d < 7; d++) {
            const slot = document.createElement('div');
            slot.className = 'print-slot-col';
            // Apply Dynamic Height
            slot.style.height = `${dynamicRowHeight}px`;
            
            const rawData = localStorage.getItem(`schedule-${d}-${h}`);
            if (rawData) {
                let data = null;
                try { data = JSON.parse(rawData); } catch(e) { 
                    data = { subject: rawData, start: `${h}:00`, end: `${h+1}:00` }; 
                }

                let color = '#e5e7eb';
                const colorMap = JSON.parse(localStorage.getItem('subjectColors') || '{}');
                
                if (data.color) color = data.color;
                else {
                    const key = data.subject.trim().toUpperCase();
                    if(colorMap[key]) color = colorMap[key];
                    else color = '#F3F4F6';
                }
                
                if(!data.weekType) data.weekType = "every";
                if(!data.type) data.type = "";

                slot.innerHTML = `
                    <div style="background-color: ${color};" class="print-event-card w-full h-full relative p-1 box-border flex flex-col justify-center">
                        
                        ${data.weekType !== 'every' ? 
                            `<div class="absolute top-1 left-1 text-[8px] font-black uppercase tracking-wider text-gray-500 opacity-60">${data.weekType}</div>` 
                            : ''}
                        
                        ${data.location ? 
                            `<div class="absolute top-1 right-1 text-[9px] font-bold text-gray-500 opacity-70">${data.location}</div>` 
                            : ''}

                        <div class="flex flex-col justify-center items-center px-4 z-10">
                            <div class="font-black text-[12px] uppercase leading-tight tracking-wide text-gray-800 text-center">${data.subject}</div>
                            <div class="text-[10px] font-bold text-gray-500 mt-0.5">${data.start} - ${data.end}</div>
                        </div>

                        ${data.type ? 
                            `<div class="absolute bottom-1 right-1 text-[8px] font-bold uppercase text-gray-400 tracking-wider opacity-80">${data.type}</div>` 
                            : ''}
                    </div>
                `;
            }
            row.appendChild(slot);
        }
        printGrid.appendChild(row);
    }
}

function closePdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function generateFinalPdf() {
    const originalElement = document.getElementById('printContainer');
    const btn = document.getElementById('confirmDownloadPdf');
    const originalText = btn.innerHTML;

    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span> Generating...`;
    btn.disabled = true;

    const clone = originalElement.cloneNode(true);
    const cloneWrapper = document.createElement('div');
    
    cloneWrapper.style.position = 'fixed';
    cloneWrapper.style.top = '-10000px'; 
    cloneWrapper.style.left = '-10000px';
    cloneWrapper.style.zIndex = '-1';
    cloneWrapper.style.width = '1500px'; 
    
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    html2canvas(clone, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); 
        
        const pageWidth = pdf.internal.pageSize.getWidth();   
        const pageHeight = pdf.internal.pageSize.getHeight(); 
        const imgProps = pdf.getImageProperties(imgData);
        
        let finalPdfWidth = pageWidth;
        let finalPdfHeight = (imgProps.height * pageWidth) / imgProps.width;

        if (finalPdfHeight > pageHeight) {
            const scaleFactor = pageHeight / finalPdfHeight;
            finalPdfWidth = pageWidth * scaleFactor;
            finalPdfHeight = pageHeight;
        }

        const xPos = (pageWidth - finalPdfWidth) / 2;
        pdf.addImage(imgData, 'PNG', xPos, 0, finalPdfWidth, finalPdfHeight);
        pdf.save('StudentDash_Schedule.pdf');

        document.body.removeChild(cloneWrapper);
        btn.innerHTML = originalText;
        btn.disabled = false;
        closePdfPreview();
    }).catch(err => {
        console.error("PDF Error:", err);
        alert("Error generating PDF.");
        if (document.body.contains(cloneWrapper)) document.body.removeChild(cloneWrapper);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}
