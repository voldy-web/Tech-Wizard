jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///cache/Print/abc.pdf', base64: 'JVBERi0xLjQ=' })),
  printAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn(async () => {}),
}));

const Print = require('expo-print');
const Sharing = require('expo-sharing');
const FileSystem = require('expo-file-system/legacy');
const { createPdf, sharePdf } = require('../src/lib/pdf');

describe('PDF export and share', () => {
  beforeEach(() => jest.clearAllMocks());

  test('asks for the PDF as base64 and writes it into the app cache under a friendly name', async () => {
    const pdf = await createPdf('<html/>', 'TW-ELR-009');
    expect(Print.printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({ base64: true, width: 595, height: 842 }));
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/Certificate-TW-ELR-009.pdf', 'JVBERi0xLjQ=', { encoding: 'base64' });
    expect(pdf.named).toBe('file:///cache/Certificate-TW-ELR-009.pdf');
    expect(pdf.uri).toBe('file:///cache/Print/abc.pdf');
  });

  test('keeps working when writing the named file fails', async () => {
    FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('nope'));
    const pdf = await createPdf('<html/>', 'X');
    expect(pdf.named).toBeNull();
    await sharePdf(pdf);
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Print/abc.pdf', expect.any(Object));
  });

  test('shares the app-written file first', async () => {
    const pdf = await createPdf('<html/>', 'X');
    await sharePdf(pdf);
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Certificate-X.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  test('falls back to the original file when the first is rejected', async () => {
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
