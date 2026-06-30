async function testFetch() {
    try {
        const res = await fetch('https://crm-nbul.onrender.com/cesar-reyes-jaramillo.vcf');
        console.log(`Status: ${res.status}`);
        console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
        const text = await res.text();
        console.log(`Body (first 100 chars):`, text.slice(0, 100));
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testFetch();
