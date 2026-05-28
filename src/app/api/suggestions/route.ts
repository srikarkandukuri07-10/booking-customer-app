import { NextResponse } from "next/server";

// Dynamic resolution of backend URL from environment variables, defaulting to localhost:3000
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const endpoint = `${BACKEND_URL}/api/suggestions`;

  try {
    const payload = await request.json();

    console.log(`[API PROXY] Proxying suggestions request to backend: ${endpoint}`);

    // Send suggestions query directly to the admin backend
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Backend suggestions server responded with status ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        if (errorText && errorText.length < 150) {
          errorMessage = errorText;
        }
      }

      console.error(`[API PROXY] Backend suggestions rejected request: ${errorMessage}`);
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[API PROXY] Suggestions gateway routing error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error?.message || "Unable to reach your admin backend server for suggestions." 
      },
      { status: 502 }
    );
  }
}
