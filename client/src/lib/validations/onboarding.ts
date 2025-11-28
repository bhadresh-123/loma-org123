import * as z from "zod";

const isPoBox = (address: string): boolean => {
  // Implement your PO Box detection logic here.  This is a placeholder.
  //  A robust solution would likely involve regular expressions or a more sophisticated address parsing library.
  return address.toLowerCase().includes("p.o. box") || address.toLowerCase().includes("po box");
};


const businessRegistrationSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required" }),
  businessAddress: z.string()
    .min(1, { message: "Business address is required" })
    .refine(
      (address) => !isPoBox(address), 
      { message: "PO Box addresses are not permitted for business registration" }
    ),
  // ... other fields
});


// Example usage:
const data = {
  companyName: "Acme Corp",
  businessAddress: "123 Main St",
};

const result = businessRegistrationSchema.safeParse(data);

if (result.success) {
  console.log("Validation successful:", result.data);
} else {
  console.error("Validation failed:", result.error.errors);
}

const data2 = {
  companyName: "Acme Corp",
  businessAddress: "PO Box 123",
};

const result2 = businessRegistrationSchema.safeParse(data2);

if (result2.success) {
  console.log("Validation successful:", result2.data);
} else {
  console.error("Validation failed:", result2.error.errors);
}