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

    // Listener for the new toggle
    const trimToggle = document.getElementById('pdfTrimToggle');
    if(trimToggle) {
        trimToggle.addEventListener('change', renderPdfGrid);
    }
}

function openPdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    const printContainer = document.getElementById('printContainer');
    
    // Set container width
    if (printContainer) printContainer.style.minWidth = "1400px";

    // Reset toggle to "Unchecked" (Smart Crop) by default every time you open it
    // Or set to 'true' if you want "Full Day" by default.
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
    
    // Default Range
    let startH = 7;
    let endH = 20;

    // --- SMART CROP LOGIC ---
    // If toggle is NOT checked (Disabled), we calculate the actual range
    if (trimToggle && !trimToggle.checked) {
        let foundMin = 20;
        let foundMax = 7;
        let hasData = false;

        // Scan all days (0-6) and hours (7-20)
        for (let h = 7; h <= 20; h++) {
            for (let d = 0; d < 7; d++) {
                if (localStorage.getItem(`schedule-${d}-${h}`)) {
                    hasData = true;
                    if (h < foundMin) foundMin = h;
                    if (h > foundMax) foundMax = h;
                }
            }
        }

        if (hasData) {
            startH = foundMin;
            endH = foundMax; 
            // Optional: Add 1 hour buffer at bottom if desired, 
            // but user asked to cut exactly to the slot.
        }
    }
    // ------------------------

    const _days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    
    dateLabel.innerText = "Generated on " + new Date().toLocaleDateString();
    printGrid.innerHTML = '';

    // 1. Render Header
    const headerRow = document.createElement('div');
    headerRow.className = 'print-header-row';
    headerRow.innerHTML = `<div class="p-3 text-center flex items-center justify-center">Time</div>`; 
    _days.forEach(d => {
        headerRow.innerHTML += `<div class="p-3 text-center border-l border-gray-700 flex items-center justify-center">${d}</div>`;
    });
    printGrid.appendChild(headerRow);

    // 2. Render Rows (based on calculated startH and endH)
    for (let h = startH; h <= endH; h++) {
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
                let data = null;
                try { data = JSON.parse(rawData); } catch(e) { 
                    data = { subject: rawData, start: `${h}:00`, end: `${h+1}:00` }; 
                }

                let color = '#e5e7eb';
                const colorMap = JSON.parse(localStorage.getItem('subjectColors') || '{}');
                const key = data.subject.trim().toLowerCase();
                if(colorMap[key]) color = colorMap[key];
                
                // Styles: Added 'mt-1.5' to location for spacing
                slot.innerHTML = `
                    <div style="background-color: ${color};" class="print-event-card p-1.5 flex flex-col justify-center h-full">
                        <div class="font-black text-[12px] uppercase leading-tight tracking-wide text-gray-800">${data.subject}</div>
                        <div class="text-[10px] mt-1 font-bold text-gray-600">${data.start} - ${data.end}</div>
                        ${data.location ? `<div class="text-[10px] mt-1.5 font-bold text-gray-700 break-words leading-tight inline-block mx-auto opacity-80">${data.location}</div>` : ''}
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
