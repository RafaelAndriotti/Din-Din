// Hash de senha com scrypt, da biblioteca padrão do Node (node:crypto).
// A senha em si nunca é guardada: o banco só recebe o resultado do hash.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Parâmetros do OWASP Password Storage Cheat Sheet para scrypt: N=2^15, r=8, p=3 (~32 MiB).
// Eles vão gravados junto do hash, então mudar os números aqui não invalida os hashes antigos.
const N = 2 ** 15;
const R = 8;
const P = 3;
const TAMANHO = 64;
// O scrypt usa cerca de 128 * N * r bytes; o dobro dá folga ao limite padrão do Node.
const memoria = (n, r) => 256 * n * r;

export async function gerarHash(senha) {
    const sal = randomBytes(16);
    const hash = await scryptAsync(senha, sal, TAMANHO, { N, r: R, p: P, maxmem: memoria(N, R) });
    return ['scrypt', N, R, P, sal.toString('base64'), hash.toString('base64')].join('$');
}

export async function conferirSenha(senha, armazenado) {
    const [algoritmo, n, r, p, sal, hash] = armazenado.split('$');
    if (algoritmo !== 'scrypt') return false;
    const esperado = Buffer.from(hash, 'base64');
    const calculado = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperado.length, {
        N: Number(n), r: Number(r), p: Number(p), maxmem: memoria(Number(n), Number(r))
    });
    // Tempo constante: o tempo da resposta não revela quantos bytes do hash bateram.
    return timingSafeEqual(calculado, esperado);
}
