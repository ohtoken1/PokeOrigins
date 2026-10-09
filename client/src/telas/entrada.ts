// Tela de entrada (antes de tudo): Entrar ou Criar conta. Depois do login, se este navegador tem um progresso
// de antes das contas e a conta ainda não tem save, oferece levar o progresso para a conta.
import { buscarConta, cadastrar, entrar, ErroApi, type Conta } from '../conta';
import { arquivarSaveAntigo, iniciarSaveDaConta, salvar, saveAntigoDoNavegador, type Save } from '../estado';
import { el } from '../ui/dom';

/** Resolve quando há uma conta logada e o save dela já está em memória. */
export async function garantirConta(raiz: HTMLElement): Promise<Conta> {
  let r: Awaited<ReturnType<typeof buscarConta>> = null;
  for (;;) {
    try {
      r = await buscarConta();
      break;
    } catch {
      // servidor fora do ar: avisa e tenta de novo
      await aguardarServidor(raiz);
    }
  }
  if (!r) {
    await formularioEntrada(raiz);
    r = await buscarConta();
    if (!r) return garantirConta(raiz);
  }
  iniciarSaveDaConta(r.conta.id, r.save as Save | null, r.versao);
  if (!r.save) await oferecerSaveAntigo(raiz);
  raiz.replaceChildren();
  return r.conta;
}

function aguardarServidor(raiz: HTMLElement): Promise<void> {
  raiz.replaceChildren(
    el('div', { class: 'tela-entrada' },
      el('div', { class: 'cartao-entrada' },
        el('h1', { class: 'logo-entrada' }, 'PokeOrigins'),
        el('p', { class: 'entrada-texto' }, 'Não foi possível falar com o servidor. Tentando de novo…'),
      ),
    ),
  );
  return new Promise((ok) => setTimeout(ok, 4000));
}

function formularioEntrada(raiz: HTMLElement): Promise<void> {
  return new Promise((pronto) => {
    let modo: 'entrar' | 'criar' = 'entrar';
    const campo = (atributos: Record<string, unknown>) => el('input', { class: 'campo-entrada', required: true, ...atributos }) as HTMLInputElement;
    const usuario = campo({ name: 'usuario', autocomplete: 'username', maxlength: 16, placeholder: 'Ex.: Ash_123' });
    const login = campo({ name: 'login', autocomplete: 'username', maxlength: 254 });
    const email = campo({ name: 'email', type: 'email', autocomplete: 'email', maxlength: 254, placeholder: 'voce@email.com' });
    const senha = campo({ name: 'senha', type: 'password', autocomplete: 'current-password', maxlength: 128 });
    const confirmar = campo({ name: 'confirmar', type: 'password', autocomplete: 'new-password', maxlength: 128 });
    const manter = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
    const erro = el('p', { class: 'entrada-erro', role: 'alert' });
    const enviar = el('button', { class: 'botao botao-entrada', type: 'submit' });
    const rotulo = (texto: string, entrada: HTMLElement, dica?: string) => el('label', { class: 'rotulo-entrada' }, el('span', {}, texto), entrada, dica ? el('small', {}, dica) : null);

    const linhaUsuario = rotulo('Nome de usuário', usuario, '3 a 16 letras, números ou _');
    const linhaLogin = rotulo('Usuário ou e-mail', login);
    const linhaEmail = rotulo('E-mail', email);
    const linhaSenha = rotulo('Senha', senha);
    const linhaConfirmar = rotulo('Confirmar senha', confirmar);
    const abaEntrar = el('button', { type: 'button', class: 'aba-entrada', onclick: () => trocar('entrar') }, 'Entrar');
    const abaCriar = el('button', { type: 'button', class: 'aba-entrada', onclick: () => trocar('criar') }, 'Criar conta');

    const trocar = (m: typeof modo) => {
      modo = m;
      const criar = m === 'criar';
      abaEntrar.classList.toggle('ativa', !criar);
      abaCriar.classList.toggle('ativa', criar);
      linhaLogin.hidden = criar;
      login.required = !criar;
      for (const [linha, entrada] of [[linhaUsuario, usuario], [linhaEmail, email], [linhaConfirmar, confirmar]] as const) {
        linha.hidden = !criar;
        entrada.required = criar;
      }
      senha.autocomplete = criar ? 'new-password' : 'current-password';
      (linhaSenha.querySelector('small') ?? linhaSenha.appendChild(el('small', {}))).textContent = criar ? 'Pelo menos 6 caracteres' : '';
      enviar.textContent = criar ? 'Criar conta' : 'Entrar';
      erro.textContent = '';
      (criar ? usuario : login).focus();
    };

    const formulario = el('form', { class: 'formulario-entrada', novalidate: true },
      el('div', { class: 'abas-entrada', role: 'tablist' }, abaEntrar, abaCriar),
      linhaUsuario, linhaLogin, linhaEmail, linhaSenha, linhaConfirmar,
      el('label', { class: 'manter-entrada' }, manter, 'Manter conectado neste computador'),
      erro, enviar,
    ) as HTMLFormElement;

    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.textContent = '';
      const criar = modo === 'criar';
      // conferências rápidas aqui; o servidor confere de novo
      if (criar && !/^[A-Za-z0-9_]{3,16}$/.test(usuario.value)) return void (erro.textContent = 'Nome de usuário: 3 a 16 letras, números ou _.');
      if (criar && !email.checkValidity()) return void (erro.textContent = 'E-mail inválido.');
      if (!criar && !login.value.trim()) return void (erro.textContent = 'Digite seu usuário ou e-mail.');
      if (criar && senha.value.length < 6) return void (erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.');
      if (!criar && !senha.value) return void (erro.textContent = 'Digite sua senha.');
      if (criar && senha.value !== confirmar.value) return void (erro.textContent = 'As senhas não são iguais.');
      enviar.disabled = true;
      enviar.textContent = criar ? 'Criando…' : 'Entrando…';
      try {
        if (criar) await cadastrar(usuario.value, email.value.trim(), senha.value, manter.checked);
        else await entrar(login.value.trim(), senha.value, manter.checked);
        pronto();
      } catch (falha) {
        erro.textContent = falha instanceof ErroApi ? falha.message : 'Algo deu errado. Tente de novo.';
        enviar.disabled = false;
        enviar.textContent = criar ? 'Criar conta' : 'Entrar';
      }
    });

    raiz.replaceChildren(
      el('div', { class: 'tela-entrada' },
        el('div', { class: 'cartao-entrada' },
          el('h1', { class: 'logo-entrada' }, 'PokeOrigins'),
          el('p', { class: 'entrada-texto' }, 'Entre na sua conta para jogar.'),
          formulario,
        ),
      ),
    );
    trocar('entrar');
  });
}

/** Primeiro login neste navegador com um progresso de antes das contas: levar para a conta ou começar do zero. */
function oferecerSaveAntigo(raiz: HTMLElement): Promise<void> {
  const antigo = saveAntigoDoNavegador();
  if (!antigo) return Promise.resolve();
  return new Promise((pronto) => {
    const pokemons = antigo.time.length + antigo.caixa.length;
    const nome = antigo.aparencia?.nome;
    const levar = el('button', { class: 'botao botao-entrada' }, 'Levar para a minha conta');
    const zero = el('button', { class: 'botao secundario' }, 'Começar do zero');
    levar.addEventListener('click', () => {
      salvar(antigo);
      arquivarSaveAntigo();
      pronto();
    });
    zero.addEventListener('click', () => {
      if (!confirm('Começar do zero nesta conta? O progresso antigo continua guardado neste navegador.')) return;
      pronto();
    });
    raiz.replaceChildren(
      el('div', { class: 'tela-entrada' },
        el('div', { class: 'cartao-entrada' },
          el('h1', { class: 'logo-entrada' }, 'PokeOrigins'),
          el('h2', { class: 'entrada-titulo' }, 'Progresso encontrado'),
          el('p', { class: 'entrada-texto' },
            `Este navegador tem um progresso de antes das contas (${nome ? `treinador ${nome}, ` : ''}${pokemons} Pokémon). Quer levá-lo para esta conta?`),
          el('div', { class: 'entrada-botoes' }, levar, zero),
        ),
      ),
    );
  });
}
