import type { MemoryType } from "./memory-types";

export interface MemoryValidationResult {
  allowed: boolean;
  confidence: number;
  reason?: string;
  type: MemoryType;
}

export class MemoryValidator {
  validate(
    key: string,
    value: string
  ): MemoryValidationResult {
    const normalizedKey = key.toLowerCase().trim();
    const normalizedValue = value.toLowerCase().trim();
    const text = `${normalizedKey} ${normalizedValue}`;

    // Never store sensitive information
    const sensitivePatterns = [
      "password",
      "passcode",
      "pin",
      "otp",
      "api key",
      "apikey",
      "secret",
      "token",
      "credit card",
      "bank account",
      "cvv",
      "iban",
    ];

    if (
      sensitivePatterns.some((item) =>
        text.includes(item)
      )
    ) {
      return {
        allowed: false,
        confidence: 0,
        reason: "Sensitive information blocked",
        type: "fact",
      };
    }

    // Preferences
    if (
      normalizedKey.startsWith("favorite") ||
      normalizedKey.startsWith("favourite") ||
      normalizedKey.startsWith("preferred") ||
      normalizedKey.startsWith("likes") ||
      normalizedKey.startsWith("dislikes")
    ) {
      return {
        allowed: true,
        confidence: 0.9,
        type: "preference",
      };
    }

    // Profile
    const profileKeys = [
      "name",
      "full_name",
      "nickname",
      "age",
      "date_of_birth",
      "birthday",
      "dob",
      "gender",
      "occupation",
      "job",
      "company",
      "city",
      "country",
      "nationality",
      "language",
    ];

    if (profileKeys.includes(normalizedKey)) {
      return {
        allowed: true,
        confidence: 0.95,
        type: "profile",
      };
    }

    // Relationships
    const relationshipKeys = [
      "wife",
      "wife_name",
      "husband",
      "husband_name",
      "mother",
      "mother_name",
      "father",
      "father_name",
      "brother",
      "sister",
      "son",
      "daughter",
      "child",
      "children",
    ];

    if (relationshipKeys.includes(normalizedKey)) {
      return {
        allowed: true,
        confidence: 0.95,
        type: "relationship",
      };
    }

    // Default
    return {
      allowed: true,
      confidence: 0.7,
      type: "fact",
    };
  }
}

export const memoryValidator = new MemoryValidator();