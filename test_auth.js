const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email: "test.antigravity123@gmail.com",
    password: "Password123!",
  });
  console.log("Signup:", error ? error.message : "Success");
  
  // Sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: "test.antigravity123@gmail.com",
    password: "Password123!",
  });
  console.log("SignIn:", signInError ? signInError.message : "Success");
}

test();
