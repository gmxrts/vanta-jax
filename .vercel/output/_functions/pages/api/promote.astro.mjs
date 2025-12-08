import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const supabaseUrl = "https://bjpnpyotaiudawhudwhm.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcG5weW90YWl1ZGF3aHVkd2htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjgyMzkyNSwiZXhwIjoyMDc4Mzk5OTI1fQ.hLlzS-G3rsTEzih1r90liZ3-T-EnkAYmY4Ex26Z3fs8";
const supabase = createClient(supabaseUrl, serviceKey) ;
const POST = async ({ request }) => {
  if (!supabase || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Server Supabase is not configured." }),
      { status: 500 }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error("Error parsing JSON body:", err);
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400
    });
  }
  const {
    suggestionId,
    name,
    category,
    address,
    city,
    state,
    zip,
    phone,
    website,
    description,
    verified
  } = body || {};
  if (!suggestionId || !name) {
    return new Response(
      JSON.stringify({ error: "suggestionId and name are required." }),
      { status: 400 }
    );
  }
  const business = {
    name: String(name).trim(),
    category: category || "services",
    address: address || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    description: description || null,
    phone: phone || null,
    website: website || null,
    verified: typeof verified === "boolean" ? verified : true
  };
  const { error: insertError } = await supabase.from("businesses").insert(business);
  if (insertError) {
    console.error("Error inserting business:", insertError);
    return new Response(
      JSON.stringify({
        error: insertError.message || "Failed to insert business."
      }),
      { status: 500 }
    );
  }
  const { error: deleteError } = await supabase.from("business_suggestions").delete().eq("id", suggestionId);
  if (deleteError) {
    console.error("Error deleting suggestion:", deleteError);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
