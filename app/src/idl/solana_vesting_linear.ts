/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_vesting_linear.json`.
 */
export type SolanaVestingLinear = {
  "address": "33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba",
  "metadata": {
    "name": "solanaVestingLinear",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Linear token vesting with cliff and revocation (Anchor)"
  },
  "docs": [
    "Entrypoint del programa `solana_vesting_linear`."
  ],
  "instructions": [
    {
      "name": "cancel",
      "docs": [
        "@notice Sender cancela un vesting revocable y cierra vault + estado.",
        "@dev Vested → beneficiary; unvested → sender; lamports de cierre → sender.",
        "@param ctx Cuentas Cancel (sender signer, beneficiary, vesting, vault, ATAs, mint).",
        "@return Result<()> Ok si payouts y cierres fueron exitosos."
      ],
      "discriminator": [
        232,
        219,
        223,
        41,
        219,
        236,
        220,
        190
      ],
      "accounts": [
        {
          "name": "sender",
          "docs": [
            "Creador del vesting; único autorizado a cancelar; recibe rent al cerrar."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "beneficiary",
          "docs": [
            "Debe ser distinto de `sender` (mitiga duplicate-account)."
          ],
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "vestingAccount",
          "docs": [
            "Estado del schedule; se cierra y los lamports vuelven al sender."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "account",
                "path": "beneficiary"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA; se vacía y se cierra hacia el sender."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vestingAccount"
              }
            ]
          }
        },
        {
          "name": "senderTokenAccount",
          "docs": [
            "Destino de tokens no vestidos."
          ],
          "writable": true
        },
        {
          "name": "beneficiaryTokenAccount",
          "docs": [
            "Destino de tokens ya vestidos (y aún no released)."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "claim",
      "docs": [
        "@notice Beneficiary reclama tokens ya vestidos (`vested - released`).",
        "@dev Tiempo solo desde `Clock` sysvar; no acepta timestamp del cliente.",
        "@param ctx Cuentas Claim (beneficiary signer, vesting, vault, ATA beneficiary, mint).",
        "@return Result<()> Ok si la transferencia y el update de `released_amount` fueron exitosos."
      ],
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "beneficiary",
          "docs": [
            "Beneficiario; debe firmar y coincidir con `vesting_account.beneficiary`."
          ],
          "signer": true,
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "vestingAccount",
          "docs": [
            "Estado del schedule."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "vesting_account.sender",
                "account": "vestingAccount"
              },
              {
                "kind": "account",
                "path": "beneficiary"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA con los tokens custodiados."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vestingAccount"
              }
            ]
          }
        },
        {
          "name": "beneficiaryTokenAccount",
          "docs": [
            "Token account del beneficiary (mismo mint)."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "@notice Crea un vesting lineal, inicializa el vault PDA y deposita `amount`.",
        "@dev Valida schedule/amount; persiste `VestingAccount` y transfiere al vault.",
        "@param ctx Cuentas Initialize (sender, beneficiary, mint, vesting, vault, …).",
        "@param start_time Unix de inicio.",
        "@param cliff_time Unix del cliff.",
        "@param end_time Unix de fin.",
        "@param amount Tokens a depositar (> 0).",
        "@param cancelable Si el sender podrá cancelar.",
        "@return Result<()> Ok si estado y depósito fueron exitosos."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "sender",
          "docs": [
            "Creador del vesting; paga rent y firma el depósito."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "beneficiary"
        },
        {
          "name": "mint",
          "docs": [
            "Mint SPL Token o Token-2022 del vesting."
          ]
        },
        {
          "name": "vestingAccount",
          "docs": [
            "Cuenta de estado del schedule (PDA)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "account",
                "path": "beneficiary"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault PDA que custodia los tokens; authority = `vesting_account`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vestingAccount"
              }
            ]
          }
        },
        {
          "name": "senderTokenAccount",
          "docs": [
            "ATA (u otra token account) del sender con al menos `amount` tokens."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "cliffTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "cancelable",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "vestingAccount",
      "discriminator": [
        102,
        73,
        10,
        233,
        200,
        188,
        228,
        216
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidVestingSchedule",
      "msg": "Invalid vesting schedule: require start_time <= cliff_time <= end_time"
    },
    {
      "code": 6001,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow or invalid math operation"
    },
    {
      "code": 6002,
      "name": "nothingToClaim",
      "msg": "Nothing to claim at the current time"
    },
    {
      "code": 6003,
      "name": "notCancelable",
      "msg": "Vesting schedule is not cancelable"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "Unauthorized signer for this instruction"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "Vesting amount must be greater than zero"
    }
  ],
  "types": [
    {
      "name": "vestingAccount",
      "docs": [
        "Estado de un schedule de vesting lineal con cliff y revocación opcional.",
        "",
        "Layout estricto C-ABI (`#[repr(C)]`), campos por alineación descendente",
        "(32 → 8 → 1) para eliminar padding interno.",
        "",
        "Espacio de cuenta: `8` (discriminador Anchor) + [`VestingAccount::INIT_SPACE`] (= 139)."
      ],
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "docs": [
              "Creador / pagador original; único autorizado a `cancel` si `cancelable`."
            ],
            "type": "pubkey"
          },
          {
            "name": "beneficiary",
            "docs": [
              "Destinatario de tokens vestidos; único autorizado a `claim`."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint SPL Token / Token-2022 del vesting."
            ],
            "type": "pubkey"
          },
          {
            "name": "startTime",
            "docs": [
              "Inicio del vesting (unix timestamp). Base del unlock lineal."
            ],
            "type": "i64"
          },
          {
            "name": "cliffTime",
            "docs": [
              "Fin del cliff: antes de este instante no hay tokens claimables."
            ],
            "type": "i64"
          },
          {
            "name": "endTime",
            "docs": [
              "Fin del vesting: a partir de aquí `vested == total_amount`."
            ],
            "type": "i64"
          },
          {
            "name": "totalAmount",
            "docs": [
              "Cantidad total depositada en el vault."
            ],
            "type": "u64"
          },
          {
            "name": "releasedAmount",
            "docs": [
              "Acumulado ya reclamado por el beneficiary."
            ],
            "type": "u64"
          },
          {
            "name": "cancelable",
            "docs": [
              "Si `true`, el sender puede invocar `cancel`."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Bump PDA de esta cuenta (`[\"vesting\", sender, beneficiary, mint]`)."
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Bump PDA del vault (`[\"vault\", vesting_account.key()]`)."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "vaultSeed",
      "docs": [
        "Prefijo PDA del vault de tokens.",
        "Seeds completas: `[VAULT_SEED, vesting_account.key()]`."
      ],
      "type": "string",
      "value": "\"vault\""
    },
    {
      "name": "vestingAccountDataLen",
      "docs": [
        "Bytes de datos de `VestingAccount` sin discriminador (`InitSpace`).",
        "Espacio total de cuenta = `8 + VESTING_ACCOUNT_DATA_LEN`."
      ],
      "type": "u16",
      "value": "139"
    },
    {
      "name": "vestingSeed",
      "docs": [
        "Prefijo PDA de la cuenta de estado `VestingAccount`.",
        "Seeds completas: `[VESTING_SEED, sender, beneficiary, mint]`."
      ],
      "type": "string",
      "value": "\"vesting\""
    }
  ]
};
