import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { messageForCode } from '../lib/error-messages';
import { ApiError } from '../lib/http';
import { announcementsApi, type Announcement } from '../lib/announcements-api';
import { AnnouncementsScreen } from './AnnouncementsScreen';

vi.mock('../lib/announcements-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/announcements-api')>()),
  announcementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    deactivate: vi.fn(),
    upload: vi.fn(),
  },
}));

const api = vi.mocked(announcementsApi);

const item = (patch: Partial<Announcement>): Announcement => ({
  id: 'a1',
  content: 'Mañana no hay clases',
  createdAt: '2026-10-01T14:30:00.000Z',
  editedAt: null,
  active: true,
  deactivatedAt: null,
  archivedAt: null,
  publishedBy: 'Admin INTEC',
  media: [],
  reactionCount: 4,
  commentCount: 2,
  ...patch,
});

const ACTIVE = item({});
const OFF = item({
  id: 'a2',
  content: 'Aviso viejo',
  active: false,
  deactivatedAt: '2026-10-02T10:00:00.000Z',
});

const page = (items: Announcement[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AnnouncementsScreen />
    </QueryClientProvider>,
  );
}

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

const publishButton = () =>
  screen.getByRole('button', { name: /publicar anuncio/i });

describe('HU24 — Anuncios institucionales', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([ACTIVE, OFF]));
  });

  it('lista los anuncios activos y desactivados con su estado y conteos', async () => {
    renderScreen();

    expect(await screen.findByText('Mañana no hay clases')).toBeInTheDocument();
    expect(screen.getByText('Aviso viejo')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Desactivado')).toBeInTheDocument();
    expect(screen.getAllByText(/4 reacciones · 2 comentarios/)).toHaveLength(2);
  });

  it('sin anuncios lo dice', async () => {
    api.list.mockResolvedValue(page([]));
    renderScreen();

    expect(
      await screen.findByText(/todavía no has publicado ningún anuncio/i),
    ).toBeInTheDocument();
  });

  it('solo los activos ofrecen Desactivar', async () => {
    renderScreen();
    await screen.findByText('Aviso viejo');

    expect(
      screen.getAllByRole('button', { name: /desactivar anuncio/i }),
    ).toHaveLength(1);
  });

  it('HU24 E1: publicar el anuncio: el botón espera texto, cuenta los caracteres y manda el texto recortado', async () => {
    const user = userEvent.setup();
    api.create.mockResolvedValue({ id: 'nuevo' });
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    expect(publishButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/texto del anuncio/i), '  Hola  ');

    expect(screen.getByText('4 / 2000')).toBeInTheDocument();
    expect(publishButton()).toBeEnabled();
    await user.click(publishButton());

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('Hola', []));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /anuncio publicado/i,
    );
    expect(screen.getByLabelText(/texto del anuncio/i)).toHaveValue('');
  });

  it('solo espacios no se puede publicar', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.type(screen.getByLabelText(/texto del anuncio/i), '    ');

    expect(publishButton()).toBeDisabled();
  });

  it('un texto de más de 2000 caracteres no se puede publicar', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.click(screen.getByLabelText(/texto del anuncio/i));
    await user.paste('x'.repeat(2001));

    expect(screen.getByText('2001 / 2000')).toBeInTheDocument();
    expect(publishButton()).toBeDisabled();
  });

  it('un adjunto se sube al elegirlo y su clave viaja al publicar', async () => {
    const user = userEvent.setup();
    api.upload.mockResolvedValue({ key: 'uploads/k1' } as never);
    api.create.mockResolvedValue({ id: 'nuevo' });
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.upload(
      screen.getByLabelText(/elegir archivos/i),
      file('foto.png', 'image/png'),
    );
    await user.type(screen.getByLabelText(/texto del anuncio/i), 'Con foto');

    const list = await screen.findByRole('list', {
      name: /archivos adjuntos/i,
    });
    expect(within(list).getByText(/foto\.png/)).toBeInTheDocument();
    expect(api.upload).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(publishButton()).toBeEnabled());
    await user.click(publishButton());

    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith('Con foto', ['uploads/k1']),
    );
  });

  it('mientras sube un archivo no deja publicar', async () => {
    const user = userEvent.setup();
    api.upload.mockReturnValue(new Promise(() => {}));
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    await user.type(screen.getByLabelText(/texto del anuncio/i), 'Aviso');

    await user.upload(
      screen.getByLabelText(/elegir archivos/i),
      file('foto.png', 'image/png'),
    );

    expect(await screen.findByText(/subiendo/i)).toBeInTheDocument();
    expect(publishButton()).toBeDisabled();
  });

  it('quitar un adjunto lo saca de la lista', async () => {
    const user = userEvent.setup();
    api.upload.mockResolvedValue({ key: 'uploads/k1' } as never);
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    await user.upload(
      screen.getByLabelText(/elegir archivos/i),
      file('foto.png', 'image/png'),
    );

    await user.click(
      await screen.findByRole('button', { name: /quitar foto/i }),
    );

    expect(
      screen.queryByRole('list', { name: /archivos adjuntos/i }),
    ).not.toBeInTheDocument();
  });

  it('rechaza un formato no permitido y un archivo muy grande sin subirlos', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    const input = screen.getByLabelText(/elegir archivos/i);

    await user.upload(input, file('virus.exe', 'application/x-msdownload'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /ese formato no se puede subir/i,
    );

    await user.upload(input, file('enorme.png', 'image/png', 6 * 1024 * 1024));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /el archivo es muy grande/i,
    );
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('no deja mezclar un PDF con una imagen', async () => {
    const user = userEvent.setup();
    api.upload.mockResolvedValue({ key: 'uploads/k1' } as never);
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    const input = screen.getByLabelText(/elegir archivos/i);
    await user.upload(input, file('foto.png', 'image/png'));

    await user.upload(input, file('guia.pdf', 'application/pdf'));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /hasta 4 imágenes, o 1 video, o 1 pdf/i,
    );
    expect(api.upload).toHaveBeenCalledTimes(1);
  });

  it('si la API rechaza la subida, lo dice en la fila y no deja la clave', async () => {
    const user = userEvent.setup();
    api.upload.mockRejectedValue(
      new ApiError(400, 'FILE_TOO_LARGE', messageForCode('FILE_TOO_LARGE')),
    );
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.upload(
      screen.getByLabelText(/elegir archivos/i),
      file('foto.png', 'image/png'),
    );

    const list = await screen.findByRole('list', {
      name: /archivos adjuntos/i,
    });
    expect(await within(list).findByText(/muy grande/i)).toBeInTheDocument();
  });

  it('si la API rechaza la publicación, explica el error y conserva el texto', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', messageForCode('FORBIDDEN')),
    );
    renderScreen();
    await screen.findByText('Mañana no hay clases');
    await user.type(screen.getByLabelText(/texto del anuncio/i), 'Aviso');

    await user.click(publishButton());

    expect(await screen.findByRole('status')).toHaveTextContent(
      /no tienes acceso a la consola/i,
    );
    expect(screen.getByLabelText(/texto del anuncio/i)).toHaveValue('Aviso');
  });

  it('desactivar pide confirmar y luego lo apaga', async () => {
    const user = userEvent.setup();
    api.deactivate.mockResolvedValue(undefined);
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.click(
      screen.getByRole('button', { name: /desactivar anuncio/i }),
    );
    expect(api.deactivate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(api.deactivate).toHaveBeenCalledWith('a1'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /anuncio desactivado/i,
    );
  });

  it('cancelar la confirmación no desactiva nada', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Mañana no hay clases');

    await user.click(
      screen.getByRole('button', { name: /desactivar anuncio/i }),
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.deactivate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /desactivar anuncio/i }),
    ).toBeInTheDocument();
  });

  it('muestra las imágenes y los enlaces de los adjuntos', async () => {
    api.list.mockResolvedValue(
      page([
        item({
          media: [
            {
              url: 'https://x/a.png',
              mediaType: 'IMAGE',
              mimeType: 'image/png',
            },
            {
              url: 'https://x/g.pdf',
              mediaType: 'DOCUMENT',
              mimeType: 'application/pdf',
            },
          ],
        }),
      ]),
    );
    renderScreen();

    expect(
      await screen.findByRole('img', { name: /imagen 1 del anuncio/i }),
    ).toHaveAttribute('src', 'https://x/a.png');
    expect(screen.getByRole('link', { name: /abrir pdf/i })).toHaveAttribute(
      'href',
      'https://x/g.pdf',
    );
  });

  it('carga la página siguiente con el cursor', async () => {
    const user = userEvent.setup();
    api.list
      .mockResolvedValueOnce(page([ACTIVE], 'a1'))
      .mockResolvedValueOnce(page([OFF]));
    renderScreen();

    await user.click(
      await screen.findByRole('button', { name: /ver más anuncios/i }),
    );

    expect(await screen.findByText('Aviso viejo')).toBeInTheDocument();
    expect(api.list.mock.calls.at(-1)?.[0]).toBe('a1');
  });

  it('si la lista falla, explica el error y deja reintentar', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(
      new ApiError(500, 'SERVER_ERROR', messageForCode('SERVER_ERROR')),
    );
    renderScreen();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('Mañana no hay clases')).toBeInTheDocument();
  });
});
