import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const supabase = createServerClient();
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    
    // Upload to 'marketing' bucket
    const { data, error } = await supabase.storage
      .from("marketing")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // Si el bucket no existe en el entorno del usuario, informamos
      if (error.message.includes("not found")) {
        return NextResponse.json({ 
          success: false, 
          error: "El bucket 'marketing' no existe en Supabase. Por favor créalo y hazlo PÚBLICO." 
        }, { status: 404 });
      }
      throw error;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from("marketing")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: fileName
    });

  } catch (error: any) {
    console.error("[Marketing Upload] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
