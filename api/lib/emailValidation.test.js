/**
 * Email Validation Tests
 * Tests for disposable email blocking, normalization, and abuse prevention
 */
import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail, hashEmail } from './emailValidation.js';

describe('Email Validation - Normal Cases', () => {
    describe('validateEmail', () => {
        it('should accept valid email addresses', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.org',
                'user+tag@example.com',
                'name123@company.co.uk'
            ];

            validEmails.forEach(email => {
                const result = validateEmail(email);
                expect(result.valid).toBe(true);
            });
        });

        it('should trim whitespace from emails', () => {
            const result = validateEmail('  test@example.com  ');
            expect(result.valid).toBe(true);
            expect(result.normalized).toBe('test@example.com');
        });

        it('should lowercase emails', () => {
            const result = validateEmail('TEST@EXAMPLE.COM');
            expect(result.normalized).toBe('test@example.com');
        });
    });
});

describe('Email Validation - Edge Cases', () => {
    describe('validateEmail edge cases', () => {
        it('should reject null email', () => {
            const result = validateEmail(null);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Email is required');
        });

        it('should reject undefined email', () => {
            const result = validateEmail(undefined);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Email is required');
        });

        it('should reject empty string', () => {
            const result = validateEmail('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Email is required');
        });

        it('should reject number input', () => {
            const result = validateEmail(123);
            expect(result.valid).toBe(false);
        });

        it('should reject array input', () => {
            const result = validateEmail(['test@example.com']);
            expect(result.valid).toBe(false);
        });

        it('should reject object input', () => {
            const result = validateEmail({ email: 'test@example.com' });
            expect(result.valid).toBe(false);
        });
    });

    describe('Malformed email formats', () => {
        it('should reject email without @', () => {
            const result = validateEmail('notanemail.com');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid email format');
        });

        it('should reject email without domain', () => {
            const result = validateEmail('test@');
            expect(result.valid).toBe(false);
        });

        it('should reject email without local part', () => {
            const result = validateEmail('@domain.com');
            expect(result.valid).toBe(false);
        });

        it('should reject email with double @', () => {
            const result = validateEmail('test@@domain.com');
            expect(result.valid).toBe(false);
        });

        it('should reject email with spaces', () => {
            const result = validateEmail('test user@domain.com');
            expect(result.valid).toBe(false);
        });

        it('should reject email without TLD', () => {
            const result = validateEmail('test@domain');
            expect(result.valid).toBe(false);
        });

        it('should reject email with single char TLD', () => {
            const result = validateEmail('test@domain.c');
            expect(result.valid).toBe(false);
        });
    });
});

describe('Email Validation - Abuse Cases', () => {
    describe('Disposable email blocking', () => {
        const disposableEmails = [
            'test@guerrillamail.com',
            'test@guerrillamail.net',
            'test@mailinator.com',
            'test@temp-mail.org',
            'test@10minutemail.com',
            'test@throwaway.email',
            'test@yopmail.com',
            'test@maildrop.cc',
            'test@trashmail.com',
            'test@burnermail.io'
        ];

        disposableEmails.forEach(email => {
            it(`should block disposable email: ${email}`, () => {
                const result = validateEmail(email);
                expect(result.valid).toBe(false);
                expect(result.error).toContain('Disposable');
            });
        });
    });

    describe('XSS and injection attempts', () => {
        it('should reject XSS in email', () => {
            const result = validateEmail('<script>alert("xss")</script>@email.com');
            expect(result.valid).toBe(false);
        });

        it('should reject HTML injection', () => {
            const result = validateEmail('"><img src=x onerror=alert(1)>@test.com');
            expect(result.valid).toBe(false);
        });

        it('should reject SQL injection', () => {
            const result = validateEmail("'; DROP TABLE users;--@email.com");
            expect(result.valid).toBe(false);
        });

        it('should reject JavaScript protocol', () => {
            const result = validateEmail('javascript:alert(1)//test@test.com');
            expect(result.valid).toBe(false);
        });
    });
});

describe('Gmail Normalization', () => {
    describe('Dot addressing', () => {
        it('should remove dots from Gmail local part', () => {
            const result = normalizeEmail('test.user@gmail.com');
            expect(result).toBe('testuser@gmail.com');
        });

        it('should handle multiple dots', () => {
            const result = normalizeEmail('t.e.s.t.u.s.e.r@gmail.com');
            expect(result).toBe('testuser@gmail.com');
        });

        it('should normalize all dot variations to same email', () => {
            const variations = [
                'testuser@gmail.com',
                'test.user@gmail.com',
                't.e.s.t.u.s.e.r@gmail.com',
                'te.st.us.er@gmail.com'
            ];

            const normalized = variations.map(e => normalizeEmail(e));
            expect(new Set(normalized).size).toBe(1);
        });
    });

    describe('Plus addressing', () => {
        it('should remove plus suffix from Gmail', () => {
            const result = normalizeEmail('testuser+spam@gmail.com');
            expect(result).toBe('testuser@gmail.com');
        });

        it('should handle complex plus suffixes', () => {
            const result = normalizeEmail('testuser+newsletter+2024@gmail.com');
            expect(result).toBe('testuser@gmail.com');
        });

        it('should normalize all plus variations to same email', () => {
            const variations = [
                'testuser@gmail.com',
                'testuser+spam@gmail.com',
                'testuser+newsletter@gmail.com',
                'testuser+random123@gmail.com'
            ];

            const normalized = variations.map(e => normalizeEmail(e));
            expect(new Set(normalized).size).toBe(1);
        });
    });

    describe('Combined dot and plus', () => {
        it('should handle both dots and plus addressing', () => {
            const result = normalizeEmail('t.e.s.t+spam@gmail.com');
            expect(result).toBe('test@gmail.com');
        });
    });

    describe('googlemail.com alias', () => {
        it('should treat googlemail.com as gmail.com', () => {
            const result = normalizeEmail('testuser@googlemail.com');
            expect(result).toBe('testuser@gmail.com');
        });

        it('should normalize googlemail with dots', () => {
            const result = normalizeEmail('test.user@googlemail.com');
            expect(result).toBe('testuser@gmail.com');
        });
    });
});

describe('Non-Gmail Plus Addressing', () => {
    it('should remove plus suffix from non-Gmail domains', () => {
        const result = normalizeEmail('user+tag@outlook.com');
        expect(result).toBe('user@outlook.com');
    });

    it('should NOT remove dots from non-Gmail domains', () => {
        const result = normalizeEmail('first.last@outlook.com');
        expect(result).toBe('first.last@outlook.com');
    });
});

describe('Email Hashing', () => {
    describe('hashEmail', () => {
        it('should produce consistent hashes', () => {
            const hash1 = hashEmail('test@email.com');
            const hash2 = hashEmail('test@email.com');

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different emails', () => {
            const hash1 = hashEmail('test1@email.com');
            const hash2 = hashEmail('test2@email.com');

            expect(hash1).not.toBe(hash2);
        });

        it('should return hex-encoded SHA-256 (64 characters)', () => {
            const hash = hashEmail('test@email.com');

            expect(hash.length).toBe(64);
            expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
        });

        it('should produce same hash for same email regardless of input timing', () => {
            // Multiple hashes over time should be consistent
            const hashes = [];
            for (let i = 0; i < 10; i++) {
                hashes.push(hashEmail('consistent@email.com'));
            }

            expect(new Set(hashes).size).toBe(1);
        });
    });

    describe('Privacy protection', () => {
        it('should not be reversible', () => {
            const hash = hashEmail('secret@email.com');

            // Hash should not contain email
            expect(hash).not.toContain('secret');
            expect(hash).not.toContain('email');
            expect(hash).not.toContain('@');
        });

        it('should be different for similar emails', () => {
            const hash1 = hashEmail('test@email.com');
            const hash2 = hashEmail('test@email.org');
            const hash3 = hashEmail('Test@email.com');

            // All should be different (case sensitive)
            expect(hash1).not.toBe(hash2);
            expect(hash1).not.toBe(hash3);
        });
    });
});

describe('Normalization and Hashing Integration', () => {
    it('should hash normalized emails consistently', () => {
        // Gmail variations should all hash to same value
        const email1 = validateEmail('test.user@gmail.com');
        const email2 = validateEmail('testuser+spam@gmail.com');
        const email3 = validateEmail('t.e.s.t.u.s.e.r@googlemail.com');

        const hash1 = hashEmail(email1.normalized);
        const hash2 = hashEmail(email2.normalized);
        const hash3 = hashEmail(email3.normalized);

        expect(hash1).toBe(hash2);
        expect(hash2).toBe(hash3);
    });

    it('should prevent multiple claims via Gmail tricks', () => {
        // Simulate claim tracking with hashed emails
        const claimedHashes = new Set();

        const attemptClaim = (email) => {
            const validation = validateEmail(email);
            if (!validation.valid) return false;

            const hash = hashEmail(validation.normalized);
            if (claimedHashes.has(hash)) return false;

            claimedHashes.add(hash);
            return true;
        };

        // First claim should succeed
        expect(attemptClaim('testuser@gmail.com')).toBe(true);

        // Variations should all be blocked
        expect(attemptClaim('test.user@gmail.com')).toBe(false);
        expect(attemptClaim('testuser+spam@gmail.com')).toBe(false);
        expect(attemptClaim('t.e.s.t.u.s.e.r@googlemail.com')).toBe(false);
    });
});
