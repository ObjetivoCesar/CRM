async function checkApi() {
    try {
        const response = await fetch('http://localhost:3000/api/leads');
        if (response.ok) {
            const data = await response.json();
            console.log('API Status: OK');
            console.log('Lead Count:', data.length);
            console.log('First Lead:', data[0]);
        } else {
            console.error('API Error:', response.status, await response.text());
        }
    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
}

checkApi();
