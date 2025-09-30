import { Request, Response } from 'express';
import { db } from '../database/banco-mongo.js';

interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}

interface Carrinho {
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

class CarrinhoController {
    async adicionarItem(req: Request, res: Response) {
        const { usuarioId, produtoId, quantidade, precoUnitario, nome } = req.body;

        if (!usuarioId || !produtoId || !quantidade || !precoUnitario || !nome) {
            return res.status(400).json({ erro: 'Dados obrigatórios faltando.' });
        }
        if( typeof quantidade !== 'number' || quantidade <= 0 ) {
            return res.status(400).json({ erro: 'Quantidade deve ser um número positivo.' });
        }

        // Procura o carrinho do usuário
        let carrinho: Carrinho | null = await db.collection<Carrinho>('carrinho').findOne({ usuarioId });

        if (!carrinho) {
            // Cria novo carrinho
            const novoItem: ItemCarrinho = { produtoId, quantidade, precoUnitario, nome };
            const novoCarrinho: Carrinho = {
                usuarioId,
                itens: [novoItem],
                dataAtualizacao: new Date(),
                total: quantidade * precoUnitario
            };
            await db.collection('carrinho').insertOne(novoCarrinho);
            return res.status(201).json({ mensagem: 'Carrinho criado e item adicionado.', carrinho: novoCarrinho });
        } else {
            // Carrinho já existe
            const itens = [...carrinho.itens];
            const idx = itens.findIndex(item => item.produtoId === produtoId);

            if (idx >= 0) {
                // Item já existe, aumenta a quantidade
                itens[idx]!.quantidade += quantidade;
            } else {
                // Item novo, adiciona ao carrinho
                itens.push({ produtoId, quantidade, precoUnitario, nome });
            }

            // Recalcula o total
            const total = itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

            await db.collection('carrinho').updateOne(
                { usuarioId },
                {
                    $set: {
                        itens,
                        dataAtualizacao: new Date(),
                        total
                    }
                }
            );

            return res.status(200).json({ mensagem: 'Item adicionado ao carrinho.', carrinho: { ...carrinho, itens, total } });
        }
    }

    async removerItem(req: Request, res: Response) {
        const { usuarioId, produtoId } = req.body;

        if (!usuarioId || !produtoId) {
            return res.status(400).json({ erro: 'usuarioId e produtoId são obrigatórios.' });
        }

        // Busca o carrinho do usuário
        let carrinho: Carrinho | null = await db.collection<Carrinho>('carrinho').findOne({ usuarioId });

        if (!carrinho) {
            return res.status(404).json({ erro: 'Carrinho não encontrado.' });
        }

        // Remove o item do carrinho
        const itensNovos = carrinho.itens.filter(item => item.produtoId !== produtoId);

        if (itensNovos.length === carrinho.itens.length) {
            return res.status(404).json({ erro: 'Item não encontrado no carrinho.' });
        }

        // Recalcula o total
        const total = itensNovos.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

        await db.collection('carrinho').updateOne(
            { usuarioId },
            {
                $set: {
                    itens: itensNovos,
                    dataAtualizacao: new Date(),
                    total
                }
            }
        );

        return res.status(200).json({ mensagem: 'Item removido do carrinho.' });
    }

    async remover(req: Request, res: Response) {
        const { usuarioId } = req.body;

        if (!usuarioId) {
            return res.status(400).json({ erro: 'usuarioId é obrigatório.' });
        }

        // Tenta remover o carrinho do usuário
        const resultado = await db.collection<Carrinho>('carrinho').deleteOne({ usuarioId });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ erro: 'Carrinho não encontrado.' });
        }

        return res.status(200).json({ mensagem: 'Carrinho removido com sucesso.' });
    }

    async listar(req: Request, res: Response) {
        const { usuarioId } = req.query;

        try {
            if (usuarioId) {
                // Lista o carrinho de um usuário específico
                const carrinho = await db.collection<Carrinho>('carrinho').findOne({ usuarioId: String(usuarioId) });
                if (!carrinho) {
                    return res.status(404).json({ erro: 'Carrinho não encontrado.' });
                }
                return res.status(200).json(carrinho);
            } else {
                // Lista todos os carrinhos
                const carrinhos = await db.collection<Carrinho>('carrinho').find().toArray();
                return res.status(200).json(carrinhos);
            }
        } catch (error) {
            return res.status(500).json({ erro: 'Erro ao listar carrinhos.' });
        }
    }

    async atualizarQuantidade(req: Request, res: Response) {
        const { usuarioId, produtoId, quantidade } = req.body;

        if (!usuarioId || !produtoId || typeof quantidade !== 'number' || quantidade <= 0) {
            return res.status(400).json({ erro: 'usuarioId, produtoId e quantidade válida são obrigatórios.' });
        }

        // Busca o carrinho do usuário
        let carrinho: Carrinho | null = await db.collection<Carrinho>('carrinho').findOne({ usuarioId });

        if (!carrinho) {
            return res.status(404).json({ erro: 'Carrinho não encontrado.' });
        }

        // Busca o item no carrinho
        const idx = carrinho.itens.findIndex(item => item.produtoId === produtoId);

        if (idx === -1) {
            return res.status(404).json({ erro: 'Item não encontrado no carrinho.' });
        }

        // Atualiza a quantidade
        carrinho.itens[idx]!.quantidade = quantidade;

        // Recalcula o total
        const total = carrinho.itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

        await db.collection('carrinho').updateOne(
            { usuarioId },
            {
                $set: {
                    itens: carrinho.itens,
                    dataAtualizacao: new Date(),
                    total
                }
            }
        );

        return res.status(200).json({ mensagem: 'Quantidade atualizada com sucesso.', carrinho: { ...carrinho, itens: carrinho.itens, total } });
    }

}
export default new CarrinhoController();