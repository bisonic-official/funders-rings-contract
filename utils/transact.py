import logging


def mint_rings(w3, contract, private_key, owner_address, num_rings,
               ring_price):
    """Set the packages.

    Parameters
    ----------
    w3 : Web3
        The web3 object.
    contract
        The contract object.
    private_key : str
        The private key.
    owner_address : str
        The owner address.
    num_rings : int
        The number of rings to mint.
    ring_price : int
        The price of one ring.
    
    Returns
    -------
    txn : dict
        The transaction dictionary.
    """

    logger = logging.getLogger('ring-minter')

    txn = contract.functions.mint(num_rings).build_transaction({
        'nonce':
        w3.eth.get_transaction_count(owner_address),
        'gas':
        1000000,
        'value':
        ring_price * num_rings
    })

    # Sign the transaction
    txn_signed = w3.eth.account.sign_transaction(txn, private_key)

    # Send the transaction and wait for the transaction receipt
    txn_hash = w3.eth.send_raw_transaction(txn_signed.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(txn_hash)
    txn_receipt = txn_receipt.transactionHash.hex()

    log_msg = f"TXN with hash: { txn_receipt }"
    logger.info(log_msg)

    return txn_receipt
