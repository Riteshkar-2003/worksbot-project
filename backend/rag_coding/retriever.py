# from pathlib import Path
# import chromadb
# from chromadb.utils import embedding_functions

# BASE_DIR = Path(__file__).resolve().parent
# CHROMA_DIR = BASE_DIR / "chroma_db"

# _client = None
# _collection = None

# def get_coding_collection():
#     global _client, _collection
#     if _collection is not None:
#         return _collection
#     try:
#         emb_fn = embedding_functions.DefaultEmbeddingFunction()
#         _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
#         _collection = _client.get_collection(
#             name="coding_knowledge",
#             embedding_function=emb_fn
#         )
#         return _collection
#     except Exception as e:
#         print(f"Warning: RAG coding collection initialization failed: {e}")
#         return None

# def retrieve_coding_knowledge(
#     query: str,
#     language: str = "python",
#     k: int = 4
# ) -> str:
#     coll = get_coding_collection()
#     if coll is None:
#         return ""

#     try:
#         search_query = f"{language} programming: {query}"
#         results = coll.query(
#             query_texts=[search_query],
#             n_results=k
#         )
#         if results and "documents" in results and results["documents"]:
#             docs = results["documents"][0]
#             return "\n\n---\n\n".join(docs)
#         return ""
#     except Exception as e:
#         print(f"Error during coding knowledge retrieval: {e}")
#         return ""

from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions


# ============================================================
# PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
CHROMA_DIR = BASE_DIR / "chroma_db"

CHROMA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# GLOBAL VARIABLES
# ============================================================

_client = None
_collection = None


# ============================================================
# GET CODING COLLECTION
# ============================================================

def get_coding_collection():

    global _client
    global _collection

    if _collection is not None:
        return _collection

    try:

        print("Initializing ChromaDB...")
        print(f"ChromaDB path: {CHROMA_DIR}")

        # Create persistent client
        _client = chromadb.PersistentClient(
            path=str(CHROMA_DIR)
        )

        # Default embedding function
        embedding_function = (
            embedding_functions.DefaultEmbeddingFunction()
        )

        # Create collection if it doesn't exist
        _collection = _client.get_or_create_collection(
            name="coding_knowledge",
            embedding_function=embedding_function
        )

        print("==============================================")
        print("CHROMADB INITIALIZED SUCCESSFULLY")
        print("==============================================")
        print(f"Collection : {_collection.name}")
        print(f"Documents  : {_collection.count()}")
        print("==============================================")

        return _collection

    except Exception as e:

        print("==============================================")
        print("CHROMADB INITIALIZATION ERROR")
        print("==============================================")
        print(f"Error type : {type(e).__name__}")
        print(f"Error      : {e}")
        print("==============================================")

        _client = None
        _collection = None

        return None


# ============================================================
# RETRIEVE CODING KNOWLEDGE
# ============================================================

def retrieve_coding_knowledge(
    query: str,
    language: str = "python",
    k: int = 4
):

    collection = get_coding_collection()

    if collection is None:
        return ""

    try:

        count = collection.count()

        if count == 0:

            print(
                "Coding knowledge collection is empty."
            )

            return ""

        k = min(k, count)

        search_query = (
            f"{language} programming: {query}"
        )

        print(
            f"Searching coding RAG: {search_query}"
        )

        results = collection.query(
            query_texts=[search_query],
            n_results=k
        )

        documents = results.get("documents", [])

        if not documents:
            return ""

        if not documents[0]:
            return ""

        return "\n\n---\n\n".join(
            documents[0]
        )

    except Exception as e:

        print("==============================================")
        print("RAG SEARCH ERROR")
        print("==============================================")
        print(f"Error: {e}")
        print("==============================================")

        return ""


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    collection = get_coding_collection()

    if collection is None:

        print(
            "ChromaDB initialization failed."
        )

    else:

        print(
            f"\nTotal documents: "
            f"{collection.count()}"
        )

        result = retrieve_coding_knowledge(
            query="Python dictionary",
            language="python",
            k=4
        )

        print("\nRetrieved knowledge:")
        print("----------------------------------------------")
        print(result)