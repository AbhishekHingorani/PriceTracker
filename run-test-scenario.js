const baseUrl = 'http://localhost:3000';

async function testScenario({ name, url, cssSelector, expectedMsg }) {
  console.log(`\n--- Starting Scenario: ${name} ---`);
  console.log(`Expected outcome: ${expectedMsg}`);

  // 1. Create product
  const createRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      url: url,
      targetPrice: 1000,
      cssSelector: cssSelector
    })
  });
  
  if (!createRes.ok) {
    console.error('Failed to create product:', await createRes.text());
    return;
  }
  
  const product = await createRes.json();
  console.log(`Product created with ID: ${product._id}`);
  
  // 2. Trigger check
  console.log('Manually triggering the price check...');
  const checkRes = await fetch(`${baseUrl}/api/products/${product._id}/check`, {
    method: 'POST'
  });
  
  // 3. Output result
  if (!checkRes.ok) {
    if (checkRes.status === 422) {
      const errResult = await checkRes.json();
      console.log(`Check finished with expected error: ${errResult.error}`);
    } else {
      console.error('Failed to check price:', await checkRes.text());
    }
  } else {
    const result = await checkRes.json();
    console.log(`Check completed! Scraped Price: $${result.scrapedPrice}`);
  }
  
  // 4. Cleanup
  console.log('Cleaning up: deleting test product...');
  const delRes = await fetch(`${baseUrl}/api/products/${product._id}`, {
    method: 'DELETE'
  });
  
  if (delRes.ok) {
    console.log('Test product deleted successfully.');
  } else {
    console.error('Failed to delete product:', await delRes.text());
  }
}

async function run() {
  await testScenario({
    name: 'Test Trigger Product (Success)',
    url: `${baseUrl}/test.html`,
    cssSelector: '#price',
    expectedMsg: 'Price drop notification sent'
  });

  await testScenario({
    name: 'Test Scrape Error Product',
    url: `${baseUrl}/test.html`,
    cssSelector: '#non-existent-id-12345',
    expectedMsg: 'Error notification sent due to missing selector'
  });

  await testScenario({
    name: 'Test Fetch Error Product',
    url: `http://localhost:3000/api/non-existent-endpoint-that-will-404`,
    cssSelector: '#price',
    expectedMsg: 'Error notification sent due to HTTP 404'
  });
}

run();
