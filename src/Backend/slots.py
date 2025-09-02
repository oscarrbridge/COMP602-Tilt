import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

slot_grid = []
bet = 2
app = FastAPI()

origins = [
     "http://localhost:5173",
    "http://127.0.0.1:5173"  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def generate_num():
    return random.randint(1, 17)
    

def generate_row():
    row = []
    for i in range(5):
        row.append(generate_num())
    return row

def spin_slots():
    slot_grid = [generate_row() for i in range(5)]
    return slot_grid

def get_duplicates(row):
    unique = []
    duplicates = []
    for item in row:
        if item not in unique:
            unique.append(item)
        else:
            if not duplicates:
                duplicates.append(item)
            elif item in duplicates:
                duplicates.append(item)

    if not duplicates:
        return []

    return duplicates




def calculate_winnings(slot_grid):

    result = []

    for row in slot_grid:
        duplicates = get_duplicates(row)  
        row_multiplier = 0
        match_value = 0  

        if duplicates:
            amount = len(duplicates) + 1  
            if amount >= 3:  
                match_value = duplicates[0]

                
                if amount == 3:
                    row_multiplier = 1
                elif amount == 4:
                    row_multiplier = 2
                elif amount == 5:
                    row_multiplier = 5

                
                if row_multiplier > 0:
                    if match_value <= 8:
                        row_multiplier *= 2
                    elif match_value <= 12:
                        row_multiplier *= 3
                    elif match_value <= 13:
                        row_multiplier *= 4
                    elif match_value <= 14:
                        row_multiplier *= 5
                    elif match_value <= 15:
                        row_multiplier *= 10
                    elif match_value <= 16:
                        row_multiplier *= 15
                    elif match_value <= 17:
                        row_multiplier *= 20

        result.append({
            "match": match_value,      
            "multiplier": row_multiplier 
        })

    return result



def print_slots(grid):
    for row in grid:
        for item in row:
            print(item, end= " ")
        
        print("Matching in row =", (get_duplicates(row)))
        print(" ")

@app.get("/spin")
def spin():
    grid = spin_slots()
    winning_data = calculate_winnings(grid)
    return {
        "grid": grid,
        "winning_data": winning_data 
    }


#grid = spin_slots()
#print_slots(grid)

#multiplier = calculate_winnings(grid)

#print("multiplier =", multiplier)
