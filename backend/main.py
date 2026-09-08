from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hospital Digital Twin API is running"}

@app.get("/departments")
def get_departments():
    return [{"name": "ER", "beds_total": 10}, {"name": "ICU", "beds_total": 6}]
