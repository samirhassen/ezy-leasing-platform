import { http, HttpResponse, delay } from 'msw';
import { 
  mockChequeRequests,
  type ChequeCollectionRequest,
  type ChequeImageRef 
} from '../data/cheques';

// In-memory store
let requests = [...mockChequeRequests];
let nextId = 1004;
let nextImageId = 5;

export const chequeHandlers = [
  // List cheque requests
  http.get('/api/cheques/requests', async ({ request }) => {
    await delay(300);
    
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const userId = url.searchParams.get('userId');

    console.log('[MSW Cheques] GET /api/cheques/requests', { role, userId });

    let filtered = [...requests];
    if (role) {
      filtered = filtered.filter(r => r.role === role);
    }
    if (userId) {
      filtered = filtered.filter(r => r.requesterUserId === userId);
    }

    console.log('[MSW Cheques] Returning', filtered.length, 'requests');

    return HttpResponse.json({
      requests: filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  }),

  // Get single request
  http.get('/api/cheques/requests/:id', async ({ params }) => {
    await delay(200);
    const { id } = params;
    const request = requests.find(r => r.id === id);

    if (!request) {
      return HttpResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ request });
  }),

  // Create new request (DRAFT)
  http.post('/api/cheques/requests', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { role: string; requesterUserId: string };

    console.log('[MSW Cheques] POST /api/cheques/requests', body);

    const newRequest: ChequeCollectionRequest = {
      id: `CHQ-REQ-${nextId++}`,
      role: body.role as any,
      requesterUserId: body.requesterUserId,
      landlordIds: [],
      propertyIds: [],
      items: [],
      pickup: {
        contactName: '',
        contactPhone: '',
        addressLine1: '',
      },
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requests.push(newRequest);
    console.log('[MSW Cheques] Created new request:', newRequest.id);
    return HttpResponse.json({ request: newRequest }, { status: 201 });
  }),

  // Upload cheque image
  http.post('/api/cheques/requests/:id/upload', async ({ params, request }) => {
    await delay(800);
    const { id } = params;
    
    // Check for error injection
    const errorCode = request.headers.get('X-Error-Force-Code');
    if (errorCode === 'ERR_UPLOAD_FAILED') {
      return HttpResponse.json(
        { 
          error: {
            code: 'ERR_UPLOAD_FAILED',
            message: 'Failed to upload file',
            module: 'cheques',
          }
        },
        { status: 500 }
      );
    }

    const targetRequest = requests.find(r => r.id === id);
    if (!targetRequest) {
      return HttpResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Simulate file upload
    const imageRef: ChequeImageRef = {
      id: `img-${nextImageId++}`,
      filename: `cheque-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: Math.floor(Math.random() * 500000) + 100000,
      hash: `hash-${Math.random().toString(36).substring(7)}`,
      url: '/placeholder.svg',
    };

    return HttpResponse.json({ image: imageRef }, { status: 201 });
  }),

  // Update request
  http.put('/api/cheques/requests/:id', async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const updates = await request.json() as Partial<ChequeCollectionRequest>;

    const index = requests.findIndex(r => r.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    const updatedRequest = {
      ...requests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Update derived fields
    if (updates.items) {
      updatedRequest.landlordIds = [...new Set(updates.items.map(i => i.landlordId))];
      updatedRequest.propertyIds = [...new Set(updates.items.map(i => i.propertyId))];
    }

    requests[index] = updatedRequest;
    return HttpResponse.json({ request: updatedRequest });
  }),

  // Submit request to bank
  http.post('/api/cheques/requests/:id/submit', async ({ params, request }) => {
    await delay(1000);
    const { id } = params;

    // Check for error injection
    const errorCode = request.headers.get('X-Error-Force-Code');
    if (errorCode === 'ERR_UPSTREAM_UNAVAILABLE') {
      return HttpResponse.json(
        {
          error: {
            code: 'ERR_UPSTREAM_UNAVAILABLE',
            message: 'Bank service is currently unavailable',
            module: 'cheques',
            retriable: true,
          }
        },
        { status: 503 }
      );
    }

    const index = requests.findIndex(r => r.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    const targetRequest = requests[index];

    // Validate request
    if (targetRequest.items.length === 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'ERR_VALIDATION',
            message: 'Request must have at least one cheque item',
            module: 'cheques',
          }
        },
        { status: 400 }
      );
    }

    if (!targetRequest.pickup.contactName || !targetRequest.pickup.contactPhone) {
      return HttpResponse.json(
        {
          error: {
            code: 'ERR_VALIDATION',
            message: 'Pickup details are incomplete',
            module: 'cheques',
          }
        },
        { status: 400 }
      );
    }

    // Generate scheduled time (tomorrow at 10:30 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);

    const bankRef = `BANK-CHQ-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    requests[index] = {
      ...targetRequest,
      status: 'SCHEDULED',
      scheduledAt: tomorrow.toISOString(),
      bankRef,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      request: requests[index],
      scheduledAt: tomorrow.toISOString(),
      bankRef,
    });
  }),

  // Cancel request
  http.post('/api/cheques/requests/:id/cancel', async ({ params }) => {
    await delay(300);
    const { id } = params;

    const index = requests.findIndex(r => r.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    requests[index] = {
      ...requests[index],
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ request: requests[index] });
  }),
];
