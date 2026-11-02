"""
schemas.py

Pydantic response models for GET /u3/results and GET /u4/results. They document
the JSON the frontend consumes (visible at http://localhost:8000/docs) and are
validated on every response.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Figure(Model):
    url: str
    caption: str
    source: str


class RerunStatus(Model):
    available: bool
    input_dir: str
    expected: str
    found_files: int


class Source(Model):
    kind: str                       # "notebook_outputs" | "rerun"
    notebook: str
    description: str
    rerun: RerunStatus


# ---------------------------------------------------------------- U3 -----

class FeatureInfo(Model):
    name: str
    band: Optional[str] = None
    detail: Optional[str] = None
    kind: Optional[str] = None


class DatePoints(Model):
    date: str
    points: int


class ClassShare(Model):
    class_: str = Field(alias="class")
    points: int
    share: Optional[float]


class U3Dataset(Model):
    site: str
    sensor: str
    n_dates: int
    total_points: int
    features: List[FeatureInfo]
    label_columns: List[str]
    points_per_date: List[DatePoints]
    reference_composition: List[ClassShare]


class KRow(Model):
    k: int
    inertia: float
    silhouette: float
    davies_bouldin: float
    inertia_drop_pct: Optional[float]


class KSelection(Model):
    selected_k: int
    rows: List[KRow]
    best_silhouette_k: int
    best_davies_bouldin_k: int
    largest_inertia_drop_k: int
    fit_sample: int
    score_sample: int


class Cluster(Model):
    id: int
    points: int
    share: Optional[float]
    means: Dict[str, float]
    assigned_class: str
    interpretation: str
    assigned_class_purity: Optional[float]
    majority_class: str
    composition: List[dict]


class Naming(Model):
    method: str
    crosstab: dict
    cluster_to_class: Dict[str, str]
    options: List[dict]


class Evaluation(Model):
    overall: Optional[dict]
    confusion_matrix: dict
    class_report: List[dict]
    accuracy: Optional[float]
    macro_avg: Optional[dict]
    weighted_avg: Optional[dict]
    by_date: List[dict]
    decision_tree: Optional[dict]
    matched_points: int
    disagreeing_points: int
    disagreeing_in_mixed_cluster: int


class MapDate(Model):
    date: str
    image_url: Optional[str]
    points: int
    metrics: Optional[dict]
    decision_tree_oa: Optional[float]


class Maps(Model):
    dates: List[MapDate]
    extent: str


class U3Results(Model):
    source: Source
    settings: dict
    dataset: U3Dataset
    k_selection: KSelection
    clusters: List[Cluster]
    naming: Naming
    evaluation: Evaluation
    maps: Maps
    figures: Dict[str, Optional[Figure]]


# ---------------------------------------------------------------- U4 -----

class ClassInfo(Model):
    code: int
    name: str
    color: Optional[str]


class Observation(Model):
    date: str
    label: str
    index: int
    area_km2: Dict[str, float]
    share_pct: Dict[str, float]
    total_km2: float
    map_url: Optional[str]


class Period(Model):
    index: int
    from_: str = Field(alias="from")
    to: str
    label: str
    P: List[List[float]]
    counts: Optional[List[List[int]]]          # pixel counts - only on a rerun from the GeoTIFFs
    area_moved_km2: List[List[float]]
    persistence: Dict[str, float]
    start_area_km2: Dict[str, float]
    end_area_km2: Dict[str, float]


class Transitions(Model):
    periods: List[Period]
    source: str
    check: Optional[dict]


class U4Results(Model):
    source: Source
    settings: dict
    classes: List[ClassInfo]
    grid: dict
    observations: List[Observation]
    transitions: Transitions
    markov: dict
    areas: dict
    change: dict
    validation: dict
    forecast: dict
    figures: Dict[str, Optional[Figure]]
