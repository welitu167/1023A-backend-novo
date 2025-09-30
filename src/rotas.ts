import carrinhoController from './carrinho/carrinho.controller.js';

import { Router } from "express";

const router = Router();

//criando rotas para os usuários

router.post('/adicionaritem', carrinhoController.adicionarItem);
router.delete('/removeritem', carrinhoController.removerItem);
router.get('/listar', carrinhoController.listar);
router.delete('/removercarrinho', carrinhoController.remover);
router.post('/atualizarquantidade', carrinhoController.atualizarQuantidade);

export default router;