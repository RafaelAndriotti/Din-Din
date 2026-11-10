import { describe, it, expect } from 'vitest';
import { idParamsSchema } from '../src/validators/idSchema.js';

describe('idParamsSchema', () => {
    it("converte '1' para o numero 1", () => {
        expect(idParamsSchema.safeParse({ id: '1' }).data).toEqual({ id: 1 });
    });

    it.each(['abc', '0', '-1', '1.5', '99999999999', ''])("rejeita '%s'", (id) => {
        expect(idParamsSchema.safeParse({ id }).success).toBe(false);
    });
});
