declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidObjectId(): R;
            toHaveValidationError(path: string): R;
        }
    }
    function testTimeout(ms: number): Promise<void>;
}
export {};
//# sourceMappingURL=setup.d.ts.map