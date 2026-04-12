document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const downloadBtn = document.getElementById('download-btn');
    const btnSpan = downloadBtn.querySelector('span');
    const btnIcon = downloadBtn.querySelector('.btn-icon');
    const terminalOutput = document.getElementById('terminal-output');

    // Make button loader SVG dynamically
    const loaderSVG = document.createElement('div');
    loaderSVG.className = 'btn-loading';
    downloadBtn.appendChild(loaderSVG);

    const logLine = (text, type = '') => {
        const line = document.createElement('div');
        line.className = `line ${type}`;
        line.innerText = `> ${text}`;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    const updateProgressBar = (percentage) => {
        const width = 40;
        const filled = Math.round((percentage / 100) * width);
        const bar = '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
        
        let progressLine = terminalOutput.querySelector('.progress-bar');
        if (!progressLine) {
            progressLine = document.createElement('div');
            progressLine.className = 'line progress-bar progress-active';
            terminalOutput.appendChild(progressLine);
        }
        progressLine.innerText = `> ${bar} ${percentage}%`;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            logLine('Error: Please provide a valid document URL.', 'error');
            return;
        }

        // UI Loading State
        urlInput.disabled = true;
        downloadBtn.disabled = true;
        btnSpan.innerText = 'Extracting...';
        btnIcon.style.display = 'none';
        loaderSVG.style.display = 'block';
        
        terminalOutput.innerHTML = ''; // clear terminal
        logLine('SCRIBEX Engine Start [REAL-TIME EXECUTION]', 'sys-msg');
        logLine(`Target: ${url}`);
        logLine('Connecting to SCRIBEX Backend Process...', 'sys-msg');
        logLine('This might take 10-60 seconds depending on the document length...');

        // Start mock interval just for UI engagement
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.floor(Math.random() * 5);
            if(progress >= 95) progress = 95; // cap until server responds
            updateProgressBar(progress);
        }, 800);

        try {
            // FIRE ACTUAL API
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                
                clearInterval(progressInterval);
                updateProgressBar(100);

                if (data.success) {
                    logLine('Extraction Successful!', 'success');
                    logLine(`File generated: ${data.filename}`, 'sys-msg');
                    logLine('Your document is downloading...', 'success');
                    
                    // Trigger real file download from the server
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = data.fileUrl; 
                    a.download = data.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                } else {
                    logLine(`Backend Error: ${data.error}`, 'error');
                    if (data.details) logLine(data.details.substring(0, 250), 'error');
                }
            } else {
                clearInterval(progressInterval);
                const textErr = await response.text();
                logLine(`Server returned an HTML/Text page instead of Data (Status ${response.status}). Are you on Port 8081?`, 'error');
                console.error("HTML Received:", textErr);
            }

        } catch (err) {
            clearInterval(progressInterval);
            logLine(`Network Error: ${err.message}`, 'error');
        } finally {
            // Restore UI
            urlInput.disabled = false;
            downloadBtn.disabled = false;
            btnSpan.innerText = 'Initialize';
            btnIcon.style.display = 'block';
            loaderSVG.style.display = 'none';
        }
    });

    // Allow Enter key to trigger download
    urlInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            downloadBtn.click();
        }
    });

    // Add some random startup glitch for coolness
    setTimeout(() => {
        terminalOutput.innerHTML += '<div class="line" style="color:var(--primary)">[SYSTEM] LIVE Uplink established via Express. Ready.</div>';
    }, 500);
});
