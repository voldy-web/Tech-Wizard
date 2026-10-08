jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(async () => ({ uri: 'file:///cache/Print/abc.pdf' })), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/', deleteAsync: jest.fn(async () => {}), copyAsync: jest.fn(async () => {}),
}));

const Sharing = require('expo-sharing');
const FileSystem = require('expo-file-system/legacy');
const { createPdf, sharePdf } = require('../src/lib/pdf');

describe('PDF export and share', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates the PDF and a friendly-named copy', async () => {
    const pdf = await createPdf('<html/>', 'TW-ELR-009');
    expect(pdf.uri).toBe('file:///cache/Print/abc.pdf');
    expect(pdf.named).toBe('file:///cache/Certificate-TW-ELR-009.pdf');
  });

  test('keeps working when the rename fails', async () => {
    FileSystem.copyAsync.mockRejectedValueOnce(new Error('nope'));
    const pdf = await createPdf('<html/>', 'X');
    expect(pdf.named).toBeNull();
    await sharePdf(pdf);
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Print/abc.pdf', expect.any(Object));
  });

  test('falls back to the original file when Android rejects the renamed copy', async () => {
    Sharing.shareAsync
      .mockRejectedValueOnce(new Error('Not allowed to read file under given URL.'))
      .mockResolvedValueOnce(undefined);
    await sharePdf({ uri: 'file:///cache/Print/abc.pdf', named: 'file:///cache/Certificate-X.pdf' });
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(2);
    expect(Sharing.shareAsync).toHaveBeenLastCalledWith('file:///cache/Print/abc.pdf', expect.any(Object));
  });

  test('reports the error if every candidate fails', async () => {
    Sharing.shareAsync.mockRejectedValue(new Error('boom'));
    await expect(sharePdf({ uri: 'a', named: 'b' })).rejects.toThrow('boom');
  });

  test('says so when sharing is unavailable', async () => {
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);
    await expect(sharePdf({ uri: 'a', named: null })).rejects.toThrow(/not available/i);
  });
});
