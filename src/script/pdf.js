/* --------------------------
   PDF GENERATION LOGIC
   -------------------------- */

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
}

function openPdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    const printGrid = document.getElementById('printGrid');
    const dateLabel = document.getElementById('printDate');
    
    // We need 'days', 'startHour', 'endHour' from script.js (Global Scope or redefine)
    // Redefining for safety in this module
    const _days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const _start = 7;
    const _end = 20;

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
    for (let h = _start; h <= _end; h++) {
        const row = document.createElement('div');
        row.className = 'print-row';
        
        const timeCol = document.createElement('div');
        timeCol.className = 'print-time-col';
        timeCol.innerText = `${h}:00`;
        row.appendChild(timeCol);

        for (let d = 0; d < 7; d++) {
            const slot = document.createElement('div');
            slot.className = 'print-slot-col';
            
            const rawData = localStorage.getItem(`schedule-${d}-${h}`);
            if (rawData) {
                // Parse helper
                let data = null;
                try { data = JSON.parse(rawData); } catch(e) { 
                    data = { subject: rawData, start: `${h}:00`, end: `${h+1}:00` }; 
                }

                // Color helper
                let color = '#e5e7eb';
                const colorMap = JSON.parse(localStorage.getItem('subjectColors') || '{}');
                const key = data.subject.trim().toLowerCase();
                if(colorMap[key]) color = colorMap[key];
                
                slot.innerHTML = `
                    <div style="background-color: ${color};" class="print-event-card">
                        <div class="font-bold text-[9px] uppercase leading-tight">${data.subject}</div>
                        <div class="text-[8px] mt-0.5 opacity-75">${data.start} - ${data.end}</div>
                        ${data.location ? `<div class="text-[8px] mt-0.5 opacity-60 truncate">${data.location}</div>` : ''}
                    </div>
                `;
            }
            row.appendChild(slot);
        }
        printGrid.appendChild(row);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
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
    cloneWrapper.style.width = '1100px'; 
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