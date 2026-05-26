import { NextResponse } from "next/server";

// Dynamic resolution of backend URL from environment variables, defaulting to localhost:3000
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const endpoint = `${BACKEND_URL}/api/orders`;

  try {
    // Parse incoming cart payload from frontend client browser
    const payload = await request.json();

    console.log(`[API PROXY] Proxying order to backend: ${endpoint}`);

    // Send a secure server-to-server POST request to the physical admin backend (no CORS blocks)
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // If backend rejects the order, forward the exact error status and message
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Backend server responded with status ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        if (errorText && errorText.length < 150) {
          errorMessage = errorText;
        }
      }

      console.error(`[API PROXY] Backend rejected request: ${errorMessage}`);
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }

    // Forward the successful backend response back to the client browser
    const data = await response.json();
    console.log(`[API PROXY] Order successfully placed on backend! Order ID: ${data.orderId}`);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[API PROXY] Gateway routing error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error?.message || "Unable to reach your admin backend server. Please verify it is running on port 3000." 
      },
      { status: 502 } // Bad Gateway
    );
  }
}
